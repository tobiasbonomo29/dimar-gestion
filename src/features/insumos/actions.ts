"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import { calcularVencimiento } from "@/lib/condicion-pago";
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
 * Registra una compra de insumos:
 *   1) egreso financiero (para el estado de resultados),
 *   2) si la compra va a plazo, la factura en Cuentas a pagar (la deuda),
 *   3) la compra con sus ítems,
 *   4) suma el stock de cada insumo.
 * La factura NO duplica el gasto: el estado de resultados mira los egresos y
 * Cuentas a pagar mira las facturas.
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

  // Vencimiento segun la condicion pactada. Sin fecha propia se usa hoy, que es
  // lo que la DB va a guardar por default.
  const fechaCompra = c.fecha ?? new Date().toISOString().slice(0, 10);
  const vencimiento = calcularVencimiento({
    fecha: fechaCompra,
    condicion: c.condicion_pago,
    dias: c.dias_pago,
    vencimientoManual: c.vencimiento,
  });
  const aPlazo = c.condicion_pago !== "contado";

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

  // 2) Factura en Cuentas a pagar (solo si queda deuda).
  let facturaId: string | null = null;
  if (aPlazo) {
    const { data: fact, error: factErr } = await supabase
      .from("facturas_compra")
      .insert({
        proveedor: c.proveedor?.trim() || "Sin proveedor",
        numero: null,
        monto: total,
        vencimiento,
        condicion_pago: c.condicion_pago,
        dias_pago: c.dias_pago,
        nota: c.nota ?? null,
        ...fechaExtra,
      })
      .select("id")
      .single();
    if (factErr) {
      await supabase.from("egresos").delete().eq("id", eg.id);
      return { ok: false, error: factErr.message };
    }
    facturaId = fact.id;
  }

  // 3) Compra + ítems.
  const { data: compra, error } = await supabase
    .from("compras")
    .insert({
      proveedor: c.proveedor ?? null,
      medio_pago: c.medio_pago,
      total,
      nota: c.nota ?? null,
      egreso_id: eg.id,
      condicion_pago: c.condicion_pago,
      dias_pago: c.dias_pago,
      vencimiento,
      factura_compra_id: facturaId,
      ...fechaExtra,
    })
    .select("id")
    .single();
  if (error) {
    await supabase.from("egresos").delete().eq("id", eg.id);
    if (facturaId) await supabase.from("facturas_compra").delete().eq("id", facturaId);
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
    if (facturaId) await supabase.from("facturas_compra").delete().eq("id", facturaId);
    return { ok: false, error: itErr.message };
  }

  // 4) Sumar stock por insumo.
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
  revalidatePath("/cuentas-pagar");
  return { ok: true, data: { id: compra.id } };
}

/** Elimina una compra: revierte el stock sumado y borra el egreso vinculado. */
export async function eliminarCompra(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: compra } = await supabase
    .from("compras")
    .select("egreso_id, factura_compra_id, compra_items(insumo_id, cantidad)")
    .eq("id", id)
    .maybeSingle<{
      egreso_id: string | null;
      factura_compra_id: string | null;
      compra_items: { insumo_id: string | null; cantidad: number }[];
    }>();
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
  // La factura generada se borra con sus pagos (cascade); si ya se pago algo,
  // ese pago desaparece junto con la deuda que lo justificaba.
  if (compra.factura_compra_id) {
    await supabase.from("facturas_compra").delete().eq("id", compra.factura_compra_id);
  }
  const { error } = await supabase.from("compras").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/insumos");
  revalidatePath("/administracion");
  revalidatePath("/cuentas-pagar");
  return { ok: true, data: undefined };
}
