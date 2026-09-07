"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";

export type RecetaLineaInput = { insumo_id: string; cantidad: number };

/** Reemplaza la receta de un producto (borra las líneas y carga las nuevas). */
export async function guardarReceta(
  productoId: string,
  lineas: RecetaLineaInput[],
): Promise<ActionResult> {
  const supabase = await createClient();

  // Validación básica.
  const limpias = lineas
    .map((l) => ({ insumo_id: l.insumo_id, cantidad: Number(l.cantidad) }))
    .filter((l) => l.insumo_id && Number.isFinite(l.cantidad) && l.cantidad > 0);

  // Deduplicar por insumo (una línea por insumo).
  const porInsumo = new Map<string, RecetaLineaInput>();
  for (const l of limpias) porInsumo.set(l.insumo_id, l);

  const { error: delErr } = await supabase.from("receta_items").delete().eq("producto_id", productoId);
  if (delErr) return { ok: false, error: delErr.message };

  if (porInsumo.size > 0) {
    const { error: insErr } = await supabase.from("receta_items").insert(
      [...porInsumo.values()].map((l) => ({
        producto_id: productoId,
        insumo_id: l.insumo_id,
        cantidad: l.cantidad,
      })),
    );
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath("/produccion");
  return { ok: true, data: undefined };
}

/**
 * Registra una producción: valida que alcance la materia prima, descuenta los
 * insumos según la receta y suma el stock del producto terminado.
 */
export async function registrarProduccion(
  productoId: string,
  cantidad: number,
  opts?: { fecha?: string; nota?: string },
): Promise<ActionResult> {
  const cant = Number(cantidad);
  if (!Number.isFinite(cant) || cant <= 0) {
    return { ok: false, error: "Ingresá una cantidad a producir mayor a 0." };
  }
  const supabase = await createClient();

  // Receta del producto + stock de cada insumo.
  const { data: receta, error: recErr } = await supabase
    .from("receta_items")
    .select("insumo_id, cantidad, insumos(nombre, presentacion, stock)")
    .eq("producto_id", productoId)
    .returns<
      { insumo_id: string; cantidad: number; insumos: { nombre: string; presentacion: string | null; stock: number } | null }[]
    >();
  if (recErr) return { ok: false, error: recErr.message };
  if (!receta || receta.length === 0) {
    return { ok: false, error: "Este producto no tiene receta cargada. Definila primero." };
  }

  // Validar stock suficiente.
  const consumos: { insumo_id: string; descripcion: string; consumo: number; nuevoStock: number }[] = [];
  for (const r of receta) {
    const consumo = cant * Number(r.cantidad);
    const stock = Number(r.insumos?.stock ?? 0);
    const nombre = r.insumos ? (r.insumos.presentacion ? `${r.insumos.nombre} · ${r.insumos.presentacion}` : r.insumos.nombre) : "insumo";
    if (consumo > stock + 0.000001) {
      const maxUnid = Number(r.cantidad) > 0 ? Math.floor(stock / Number(r.cantidad)) : 0;
      return {
        ok: false,
        error: `No alcanza "${nombre}": necesitás ${consumo} y hay ${stock}. Con ese insumo podés producir hasta ${maxUnid} unidades.`,
      };
    }
    consumos.push({ insumo_id: r.insumo_id, descripcion: nombre, consumo, nuevoStock: stock - consumo });
  }

  // Cabecera de producción.
  const { data: prod, error: pErr } = await supabase
    .from("producciones")
    .insert({ producto_id: productoId, cantidad: cant, nota: opts?.nota?.trim() ? opts.nota.trim() : null, ...(opts?.fecha ? { fecha: opts.fecha } : {}) })
    .select("id")
    .single();
  if (pErr) return { ok: false, error: pErr.message };

  const { error: piErr } = await supabase.from("produccion_items").insert(
    consumos.map((c) => ({ produccion_id: prod.id, insumo_id: c.insumo_id, descripcion: c.descripcion, cantidad: c.consumo })),
  );
  if (piErr) {
    await supabase.from("producciones").delete().eq("id", prod.id);
    return { ok: false, error: piErr.message };
  }

  // Descontar insumos y sumar producto terminado.
  for (const c of consumos) {
    await supabase.from("insumos").update({ stock: c.nuevoStock }).eq("id", c.insumo_id);
  }
  const { data: p } = await supabase.from("productos").select("stock").eq("id", productoId).maybeSingle();
  if (p) {
    await supabase.from("productos").update({ stock: Number(p.stock) + cant }).eq("id", productoId);
  }

  revalidatePath("/produccion");
  revalidatePath("/productos");
  revalidatePath("/insumos");
  return { ok: true, data: undefined };
}

/** Revierte una producción: repone la materia prima consumida y baja el producto terminado. */
export async function eliminarProduccion(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: prod } = await supabase
    .from("producciones")
    .select("producto_id, cantidad, produccion_items(insumo_id, cantidad)")
    .eq("id", id)
    .maybeSingle<{ producto_id: string; cantidad: number; produccion_items: { insumo_id: string | null; cantidad: number }[] }>();
  if (!prod) return { ok: false, error: "No existe la producción." };

  // Reponer insumos.
  for (const it of prod.produccion_items ?? []) {
    if (!it.insumo_id) continue;
    const { data: ins } = await supabase.from("insumos").select("stock").eq("id", it.insumo_id).maybeSingle();
    if (ins) await supabase.from("insumos").update({ stock: Number(ins.stock) + Number(it.cantidad) }).eq("id", it.insumo_id);
  }
  // Bajar producto terminado.
  const { data: p } = await supabase.from("productos").select("stock").eq("id", prod.producto_id).maybeSingle();
  if (p) await supabase.from("productos").update({ stock: Number(p.stock) - Number(prod.cantidad) }).eq("id", prod.producto_id);

  const { error } = await supabase.from("producciones").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/produccion");
  revalidatePath("/productos");
  revalidatePath("/insumos");
  return { ok: true, data: undefined };
}
