"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pagoSchema, type PagoFormValues } from "./schema";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Registra un pago de un cliente (opcionalmente asociado a un pedido). */
export async function registrarPago(
  values: PagoFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = pagoSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pagos")
    .insert({
      cliente_id: parsed.data.cliente_id,
      pedido_id: parsed.data.pedido_id ?? null,
      monto: parsed.data.monto,
      fecha: parsed.data.fecha,
      medio_pago: parsed.data.medio_pago,
      nota: parsed.data.nota ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientes/${parsed.data.cliente_id}`);
  revalidatePath("/clientes");
  revalidatePath("/");
  return { ok: true, data: { id: data.id } };
}

export async function eliminarPago(id: string, clienteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("pagos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  revalidatePath("/");
  return { ok: true, data: undefined };
}
