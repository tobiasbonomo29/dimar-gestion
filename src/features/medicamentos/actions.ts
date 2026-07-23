"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";

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
