"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import type { Remito } from "@/types/database";
import { remitoSchema, type RemitoFormValues } from "./schema";

/**
 * Crea un remito suelto con sus renglones de mercadería. El número correlativo
 * lo asigna la DB (columna identity). No toca stock ni cuenta corriente.
 * Devuelve el remito creado (con su número) para poder generar el PDF.
 */
export async function createRemito(
  values: RemitoFormValues,
): Promise<ActionResult<{ id: string; remito: Remito }>> {
  const parsed = remitoSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const { items, ...remito } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("remitos")
    .insert({
      destinatario: remito.destinatario,
      destinatario_direccion: remito.destinatario_direccion ?? null,
      destinatario_cuit: remito.destinatario_cuit ?? null,
      notas: remito.notas ?? null,
      // Solo mando la fecha si el usuario la eligió; si no, usa el default de la DB.
      ...(remito.fecha ? { fecha: remito.fecha } : {}),
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };

  const { error: itemsError } = await supabase.from("remito_items").insert(
    items.map((it) => ({
      remito_id: data.id,
      producto_id: it.producto_id ?? null,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      unidad: it.unidad ?? null,
    })),
  );

  if (itemsError) {
    // Revierte el remito si fallan los ítems (no queda un remito vacío).
    await supabase.from("remitos").delete().eq("id", data.id);
    return { ok: false, error: itemsError.message };
  }

  revalidatePath("/remitos");
  return { ok: true, data: { id: data.id, remito: data as Remito } };
}

/** Elimina un remito (y sus ítems por cascade). */
export async function deleteRemito(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("remitos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/remitos");
  return { ok: true, data: undefined };
}
