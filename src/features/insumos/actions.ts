"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import {
  insumoSchema,
  compraSchema,
  type InsumoFormValues,
  type CompraFormValues,
} from "./schema";

// --- Insumos -----------------------------------------------------------------
export async function crearInsumo(values: InsumoFormValues): Promise<ActionResult> {
  const parsed = insumoSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const i = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("insumos").insert({
    nombre: i.nombre,
    presentacion: i.presentacion ?? null,
    unidad_medida: i.unidad_medida,
    categoria: i.categoria ?? null,
    stock: i.stock,
    stock_minimo: i.stock_minimo,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/insumos");
  return { ok: true, data: undefined };
}

export async function actualizarInsumo(id: string, values: InsumoFormValues): Promise<ActionResult> {
  const parsed = insumoSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const i = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("insumos")
    .update({
      nombre: i.nombre,
      presentacion: i.presentacion ?? null,
      unidad_medida: i.unidad_medida,
      categoria: i.categoria ?? null,
      stock: i.stock,
      stock_minimo: i.stock_minimo,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/insumos");
  return { ok: true, data: undefined };
}

export async function eliminarInsumo(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("insumos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/insumos");
  return { ok: true, data: undefined };
}

// --- Compras (entrecruzado con inventario y con egresos) ---------------------
/**
 * Registra una compra de insumos: crea el egreso financiero (para el estado de
 * resultados), la compra con sus ítems, y SUMA el stock de cada insumo.
 */
export async function crearCompra(
  values: CompraFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = compraSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const { items, ...c } = parsed.data;
  const supabase = await createClient();
  const total = items.reduce((a, it) => a + it.cantidad * it.precio_unitario, 0);
  const fechaExtra = c.fecha ? { fecha: c.fecha } : {};

  // 1) Egreso financiero (para que impacte en el estado de resultados).
  const { data: eg, error: egErr } = await supabase
    .from("egresos")
    .insert({
      tipo: "compra",
      concepto: c.proveedor ? `Compra de insumos - ${c.proveedor}` : "Compra de insumos",
      proveedor: c.proveedor ?? null,
      categoria: "Insumos",
      monto: total,
      medio_pago: c.medio_pago,
      nota: c.nota ?? null,
      ...fechaExtra,
    })
    .select("id")
    .single();
  if (egErr) return { ok: false, error: egErr.message };

  // 2) Compra + ítems.
  const { data: compra, error } = await supabase
    .from("compras")
    .insert({
      proveedor: c.proveedor ?? null,
      medio_pago: c.medio_pago,
      total,
      nota: c.nota ?? null,
      egreso_id: eg.id,
      ...fechaExtra,
    })
    .select("id")
    .single();
  if (error) {
    await supabase.from("egresos").delete().eq("id", eg.id);
    return { ok: false, error: error.message };
  }

  const { error: itErr } = await supabase.from("compra_items").insert(
    items.map((it) => ({
      compra_id: compra.id,
      insumo_id: it.insumo_id ?? null,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
    })),
  );
  if (itErr) {
    await supabase.from("compras").delete().eq("id", compra.id);
    await supabase.from("egresos").delete().eq("id", eg.id);
    return { ok: false, error: itErr.message };
  }

  // 3) Sumar stock por insumo.
  const porInsumo = new Map<string, number>();
  for (const it of items) {
    if (it.insumo_id) porInsumo.set(it.insumo_id, (porInsumo.get(it.insumo_id) ?? 0) + it.cantidad);
  }
  for (const [insumoId, cant] of porInsumo) {
    const { data: ins } = await supabase.from("insumos").select("stock").eq("id", insumoId).maybeSingle();
    if (ins) {
      await supabase.from("insumos").update({ stock: Number(ins.stock) + cant }).eq("id", insumoId);
    }
  }

  revalidatePath("/insumos");
  revalidatePath("/administracion");
  return { ok: true, data: { id: compra.id } };
}

/** Elimina una compra: revierte el stock sumado y borra el egreso vinculado. */
export async function eliminarCompra(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: compra } = await supabase
    .from("compras")
    .select("egreso_id, compra_items(insumo_id, cantidad)")
    .eq("id", id)
    .maybeSingle<{ egreso_id: string | null; compra_items: { insumo_id: string | null; cantidad: number }[] }>();
  if (!compra) return { ok: false, error: "No existe la compra." };

  // Revertir stock.
  const porInsumo = new Map<string, number>();
  for (const it of compra.compra_items ?? []) {
    if (it.insumo_id) porInsumo.set(it.insumo_id, (porInsumo.get(it.insumo_id) ?? 0) + Number(it.cantidad));
  }
  for (const [insumoId, cant] of porInsumo) {
    const { data: ins } = await supabase.from("insumos").select("stock").eq("id", insumoId).maybeSingle();
    if (ins) {
      await supabase.from("insumos").update({ stock: Number(ins.stock) - cant }).eq("id", insumoId);
    }
  }

  if (compra.egreso_id) await supabase.from("egresos").delete().eq("id", compra.egreso_id);
  const { error } = await supabase.from("compras").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/insumos");
  revalidatePath("/administracion");
  return { ok: true, data: undefined };
}
