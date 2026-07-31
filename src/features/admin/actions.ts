"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import { egresoSchema, aporteSchema, type EgresoFormValues, type AporteFormValues } from "./schema";

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
    origen: e.origen,
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

/** Alta de un aporte de capital (con quién lo hizo). */
export async function crearAporte(values: AporteFormValues): Promise<ActionResult> {
  const parsed = aporteSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const a = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("aportes_capital").insert({
    aportante: a.aportante,
    monto: a.monto,
    origen: a.origen,
    nota: a.nota ?? null,
    ...(a.fecha ? { fecha: a.fecha } : {}),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/administracion");
  return { ok: true, data: undefined };
}

export async function deleteAporte(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("aportes_capital").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/administracion");
  return { ok: true, data: undefined };
}
