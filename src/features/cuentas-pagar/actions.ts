"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import {
  facturaCompraSchema,
  pagoCompraSchema,
  type FacturaCompraFormValues,
  type PagoCompraFormValues,
} from "./schema";

export async function crearFacturaCompra(values: FacturaCompraFormValues): Promise<ActionResult> {
  const parsed = facturaCompraSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const f = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("facturas_compra").insert({
    proveedor: f.proveedor,
    numero: f.numero ?? null,
    monto: f.monto,
    nota: f.nota ?? null,
    ...(f.fecha ? { fecha: f.fecha } : {}),
    vencimiento: f.vencimiento,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/cuentas-pagar");
  return { ok: true, data: undefined };
}

export async function eliminarFacturaCompra(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("facturas_compra").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/cuentas-pagar");
  return { ok: true, data: undefined };
}

/** Registra un pago contra una factura de compra. */
export async function registrarPagoCompra(
  facturaId: string,
  values: PagoCompraFormValues,
): Promise<ActionResult> {
  const parsed = pagoCompraSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("pagos_compra").insert({
    factura_compra_id: facturaId,
    monto: p.monto,
    medio_pago: p.medio_pago,
    nota: p.nota ?? null,
    ...(p.fecha ? { fecha: p.fecha } : {}),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/cuentas-pagar");
  return { ok: true, data: undefined };
}
