"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteSchema, type ClienteFormValues } from "./schema";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Alta de cliente. Devuelve el id creado para poder encadenar (ej. desde un pedido). */
export async function createCliente(
  values: ClienteFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = clienteSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      razon_social: parsed.data.razon_social,
      nombre_contacto: parsed.data.nombre_contacto ?? null,
      email: parsed.data.email ?? null,
      telefono: parsed.data.telefono ?? null,
      condicion_fiscal: parsed.data.condicion_fiscal,
      cuit: parsed.data.cuit ?? null,
      direccion: parsed.data.direccion ?? null,
      notas: parsed.data.notas ?? null,
      vendedor_id: parsed.data.vendedor_id ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clientes");
  return { ok: true, data: { id: data.id } };
}

export async function updateCliente(
  id: string,
  values: ClienteFormValues,
): Promise<ActionResult> {
  const parsed = clienteSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({
      razon_social: parsed.data.razon_social,
      nombre_contacto: parsed.data.nombre_contacto ?? null,
      email: parsed.data.email ?? null,
      telefono: parsed.data.telefono ?? null,
      condicion_fiscal: parsed.data.condicion_fiscal,
      cuit: parsed.data.cuit ?? null,
      direccion: parsed.data.direccion ?? null,
      notas: parsed.data.notas ?? null,
      vendedor_id: parsed.data.vendedor_id ?? null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/clientes");
  return { ok: true, data: undefined };
}

export async function deleteCliente(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) {
    // FK restrict: el cliente tiene pedidos asociados.
    if (error.code === "23503") {
      return {
        ok: false,
        error: "No se puede eliminar: el cliente tiene pedidos asociados.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/clientes");
  return { ok: true, data: undefined };
}
