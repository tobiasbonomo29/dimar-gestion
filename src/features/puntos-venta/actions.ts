"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import { puntoVentaSchema, type PuntoVentaFormValues } from "./schema";

/** Alta de un punto de venta. unidad_id lo completa el default de la DB. */
export async function crearPuntoVenta(values: PuntoVentaFormValues): Promise<ActionResult> {
  const parsed = puntoVentaSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("puntos_venta")
    .insert({ numero: parsed.data.numero, nombre: parsed.data.nombre ?? null });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya existe un punto de venta con ese número." };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/puntos-venta");
  return { ok: true, data: undefined };
}

/** Activa o desactiva un punto de venta (los inactivos no se pueden elegir al emitir). */
export async function togglePuntoVenta(id: string, activo: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("puntos_venta").update({ activo }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/puntos-venta");
  return { ok: true, data: undefined };
}
