"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import { egresoSchema, type EgresoFormValues } from "./schema";

/** Alta de una compra o erogación. unidad_id lo completa el default de la DB. */
export async function createEgreso(values: EgresoFormValues): Promise<ActionResult> {
  const parsed = egresoSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const e = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("egresos").insert({
    tipo: e.tipo,
    concepto: e.concepto,
    proveedor: e.proveedor ?? null,
    categoria: e.categoria ?? null,
    monto: e.monto,
    medio_pago: e.medio_pago,
    nota: e.nota ?? null,
    ...(e.fecha ? { fecha: e.fecha } : {}),
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/administracion");
  return { ok: true, data: undefined };
}

export async function deleteEgreso(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("egresos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/administracion");
  return { ok: true, data: undefined };
}
