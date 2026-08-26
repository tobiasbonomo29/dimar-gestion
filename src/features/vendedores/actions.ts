"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import { vendedorSchema, type VendedorFormValues } from "./schema";

export async function crearVendedor(values: VendedorFormValues): Promise<ActionResult> {
  const parsed = vendedorSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("vendedores")
    .insert({ nombre: parsed.data.nombre, comision_porcentaje: parsed.data.comision_porcentaje });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/vendedores");
  revalidatePath("/administracion");
  return { ok: true, data: undefined };
}

export async function updateVendedor(
  id: string,
  values: VendedorFormValues,
): Promise<ActionResult> {
  const parsed = vendedorSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("vendedores")
    .update({ nombre: parsed.data.nombre, comision_porcentaje: parsed.data.comision_porcentaje })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/vendedores");
  revalidatePath("/administracion");
  return { ok: true, data: undefined };
}

export async function toggleVendedor(id: string, activo: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("vendedores").update({ activo }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/vendedores");
  return { ok: true, data: undefined };
}
