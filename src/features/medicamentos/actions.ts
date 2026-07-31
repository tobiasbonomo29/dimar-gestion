"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import {
  getAuxMap,
  getBaseCompleta,
  getNovedades,
  type AlfabetaArticulo,
} from "./alfabeta";

/** Una fila de medicamento a importar (ya parseada y mapeada en el cliente). */
export type MedicamentoImportRow = {
  nro_registro: string;
  descripcion: string;
  precio: number;
  droga?: string | null;
  laboratorio?: string | null;
  presentacion?: string | null;
  codigo_barras?: string | null;
  troquel?: string | null;
};

const BATCH = 500;

/**
 * Importa/actualiza medicamentos por lote. Upsert por (unidad_id, nro_registro):
 * los que ya existen se actualizan (precio, etc.), los nuevos se crean. Ideal
 * para la actualización diaria de la lista de Alfabeta.
 */
export async function importarMedicamentos(
  rows: MedicamentoImportRow[],
): Promise<ActionResult<{ importados: number }>> {
  const supabase = await createClient();

  // Unidad actual (para que el upsert por (unidad_id, nro_registro) sea inequívoco).
  const { data: unidad, error: uErr } = await supabase.from("unidades").select("id").maybeSingle();
  if (uErr) return { ok: false, error: uErr.message };
  if (!unidad) return { ok: false, error: "No se pudo determinar la unidad del usuario." };

  // Normaliza y descarta filas sin clave o sin descripción.
  const ahora = new Date().toISOString();
  const limpias = rows
    .map((r) => ({
      unidad_id: unidad.id,
      nro_registro: String(r.nro_registro ?? "").trim(),
      descripcion: String(r.descripcion ?? "").trim(),
      droga: r.droga?.trim() || null,
      laboratorio: r.laboratorio?.trim() || null,
      presentacion: r.presentacion?.trim() || null,
      precio: Number.isFinite(r.precio) ? r.precio : 0,
      codigo_barras: r.codigo_barras?.trim() || null,
      troquel: r.troquel?.trim() || null,
      actualizado_en: ahora,
    }))
    .filter((r) => r.nro_registro && r.descripcion);

  if (limpias.length === 0) {
    return { ok: false, error: "No se detectaron filas válidas (falta Nº de registro o descripción)." };
  }

  // Deduplica por nro_registro (el archivo podría traer repetidos): última gana.
  const porRegistro = new Map<string, (typeof limpias)[number]>();
  for (const r of limpias) porRegistro.set(r.nro_registro, r);
  const finales = [...porRegistro.values()];

  let importados = 0;
  for (let i = 0; i < finales.length; i += BATCH) {
    const lote = finales.slice(i, i + BATCH);
    const { error } = await supabase
      .from("medicamentos")
      .upsert(lote, { onConflict: "unidad_id,nro_registro" });
    if (error) return { ok: false, error: error.message };
    importados += lote.length;
  }

  revalidatePath("/medicamentos");
  return { ok: true, data: { importados } };
}

/** Vacía el catálogo de medicamentos de la unidad (RLS limita a la unidad actual). */
export async function vaciarMedicamentos(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("medicamentos")
    .delete()
    .not("id", "is", null); // borra todas las filas visibles (las de la unidad)
  if (error) return { ok: false, error: error.message };
  revalidatePath("/medicamentos");
  return { ok: true, data: undefined };
}

// =============================================================================
// Sincronización con la API de Alfabeta
// =============================================================================

function articuloToRow(
  a: AlfabetaArticulo,
  labs: Map<number, string>,
  drogas: Map<number, string>,
): MedicamentoImportRow {
  return {
    nro_registro: String(a.id ?? "").trim(),
    descripcion: (a.nombre ?? "").trim(),
    precio: Number(a.precio) || 0,
    droga: a.droga ? drogas.get(a.droga) ?? null : null,
    laboratorio: a.laboratorio ? labs.get(a.laboratorio) ?? null : null,
    presentacion: a.presentacion?.trim() || null,
    codigo_barras: a.codigoDeBarras?.[0] ?? null,
    troquel: a.troquel?.trim() || null,
  };
}

async function guardarEstadoAlfabeta(ultimolog: number): Promise<void> {
  const supabase = await createClient();
  const { data: unidad } = await supabase.from("unidades").select("id").maybeSingle();
  if (!unidad) return;
  await supabase
    .from("alfabeta_estado")
    .upsert(
      { unidad_id: unidad.id, ultimolog, ultima_sync: new Date().toISOString() },
      { onConflict: "unidad_id" },
    );
}

/**
 * Carga (o recarga) TODO el catálogo desde la base completa de Alfabeta.
 * test=true trae pocos registros (para probar sin bajar toda la base).
 * Guarda el ultimolog para poder traer novedades después.
 */
export async function sincronizarBaseAlfabeta(
  test: boolean,
): Promise<ActionResult<{ importados: number; ultimolog: number }>> {
  try {
    const [labs, drogas] = await Promise.all([getAuxMap("laboratorios"), getAuxMap("drogas")]);
    const base = await getBaseCompleta(test);
    const rows = base.articulos
      .map((a) => articuloToRow(a, labs, drogas))
      .filter((r) => r.nro_registro && r.descripcion);

    if (rows.length === 0) {
      return { ok: false, error: "Alfabeta no devolvió artículos." };
    }
    const res = await importarMedicamentos(rows);
    if (!res.ok) return res;

    await guardarEstadoAlfabeta(base.ultimolog);
    revalidatePath("/medicamentos");
    return { ok: true, data: { importados: res.data.importados, ultimolog: base.ultimolog } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al sincronizar con Alfabeta" };
  }
}

/**
 * Trae solo las novedades desde el último log y las aplica:
 *  - P: cambio de precio · B: baja (inactiva) · A/M/R: alta/modificación (upsert).
 * Actualiza el ultimolog. Ideal para correr 1–2 veces por día.
 */
export async function traerNovedadesAlfabeta(): Promise<
  ActionResult<{ cambios: number; ultimolog: number }>
> {
  try {
    const supabase = await createClient();
    const { data: unidad } = await supabase.from("unidades").select("id").maybeSingle();
    if (!unidad) return { ok: false, error: "No se pudo determinar la unidad." };

    const { data: estado } = await supabase
      .from("alfabeta_estado")
      .select("ultimolog")
      .eq("unidad_id", unidad.id)
      .maybeSingle();
    if (!estado?.ultimolog) {
      return { ok: false, error: "Primero cargá la base completa (así queda el punto de partida)." };
    }

    const nov = await getNovedades(estado.ultimolog);
    if (nov.sinNovedades || nov.datos.length === 0) {
      await guardarEstadoAlfabeta(nov.ultimolog);
      return { ok: true, data: { cambios: 0, ultimolog: nov.ultimolog } };
    }

    // Aux maps solo si hay altas/modificaciones que traen el artículo completo.
    const necesitaAux = nov.datos.some((d) => ["A", "M", "R"].includes(d.operacion));
    const labs = necesitaAux ? await getAuxMap("laboratorios") : new Map<number, string>();
    const drogas = necesitaAux ? await getAuxMap("drogas") : new Map<number, string>();

    const ahora = new Date().toISOString();
    const upserts: MedicamentoImportRow[] = [];
    let cambios = 0;

    for (const d of nov.datos) {
      if (d.operacion === "P" && d.registro != null) {
        await supabase
          .from("medicamentos")
          .update({ precio: Number(d.precio) || 0, actualizado_en: ahora })
          .eq("unidad_id", unidad.id)
          .eq("nro_registro", String(d.registro));
        cambios++;
      } else if (d.operacion === "B" && d.registro != null) {
        await supabase
          .from("medicamentos")
          .update({ activo: false, actualizado_en: ahora })
          .eq("unidad_id", unidad.id)
          .eq("nro_registro", String(d.registro));
        cambios++;
      } else if (["A", "M", "R"].includes(d.operacion) && d.articulo) {
        upserts.push(articuloToRow(d.articulo, labs, drogas));
      }
      // T/C/D (cambios en tablas auxiliares) se ignoran: se reflejan en la próxima base completa.
    }

    if (upserts.length > 0) {
      const res = await importarMedicamentos(upserts.filter((r) => r.nro_registro && r.descripcion));
      if (!res.ok) return res;
      cambios += upserts.length;
    }

    await guardarEstadoAlfabeta(nov.ultimolog);
    revalidatePath("/medicamentos");
    return { ok: true, data: { cambios, ultimolog: nov.ultimolog } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al traer novedades de Alfabeta" };
  }
}
