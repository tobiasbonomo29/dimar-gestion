"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import {
  productoSchema,
  bulkPreciosSchema,
  type ProductoFormValues,
  type BulkPreciosValues,
} from "./schema";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Asegura que la categoría exista en la tabla `categorias` de la unidad actual.
 * Idempotente: si ya existe, ignora el conflicto. La unidad_id la pone el
 * default de la DB (current_unidad_id()).
 */
async function ensureCategoria(supabase: SupabaseServer, nombre: string) {
  const { error } = await supabase
    .from("categorias")
    .insert({ nombre })
    .select("id");
  // 23505 = ya existe esa categoría en la unidad: es lo esperado, se ignora.
  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

export async function createProducto(
  values: ProductoFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = productoSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const { variantes, ...producto } = parsed.data;

  const supabase = await createClient();
  await ensureCategoria(supabase, producto.categoria);
  const { data, error } = await supabase
    .from("productos")
    .insert({
      codigo: producto.codigo ?? null,
      nombre: producto.nombre,
      categoria: producto.categoria,
      descripcion: producto.descripcion ?? null,
      unidad_medida: producto.unidad_medida,
      precio_base: producto.precio_base,
      stock: producto.stock,
      activo: producto.activo,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya existe un producto con ese código." };
    return { ok: false, error: error.message };
  }

  if (variantes.length > 0) {
    const { error: vErr } = await supabase.from("producto_variantes").insert(
      variantes.map((v) => ({
        producto_id: data.id,
        nombre: v.nombre,
        tamano: v.tamano ?? null,
        presentacion: v.presentacion ?? null,
        cantidad_por_bulto: v.cantidad_por_bulto,
        precio: v.precio,
      })),
    );
    if (vErr) return { ok: false, error: vErr.message };
  }

  revalidatePath("/productos");
  return { ok: true, data: { id: data.id } };
}

export async function updateProducto(
  id: string,
  values: ProductoFormValues,
): Promise<ActionResult> {
  const parsed = productoSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }
  const { variantes, ...producto } = parsed.data;
  const supabase = await createClient();
  await ensureCategoria(supabase, producto.categoria);

  const { error } = await supabase
    .from("productos")
    .update({
      codigo: producto.codigo ?? null,
      nombre: producto.nombre,
      categoria: producto.categoria,
      descripcion: producto.descripcion ?? null,
      unidad_medida: producto.unidad_medida,
      precio_base: producto.precio_base,
      stock: producto.stock,
      activo: producto.activo,
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya existe un producto con ese código." };
    return { ok: false, error: error.message };
  }

  // Sincroniza variantes: elimina las que se quitaron, actualiza/crea el resto.
  const { data: existentes } = await supabase
    .from("producto_variantes")
    .select("id")
    .eq("producto_id", id);

  const idsEnviados = new Set(variantes.filter((v) => v.id).map((v) => v.id!));
  const aEliminar = (existentes ?? [])
    .map((e) => e.id)
    .filter((eid) => !idsEnviados.has(eid));

  if (aEliminar.length > 0) {
    const { error: delErr } = await supabase
      .from("producto_variantes")
      .delete()
      .in("id", aEliminar);
    if (delErr) return { ok: false, error: delErr.message };
  }

  for (const v of variantes) {
    const payload = {
      producto_id: id,
      nombre: v.nombre,
      tamano: v.tamano ?? null,
      presentacion: v.presentacion ?? null,
      cantidad_por_bulto: v.cantidad_por_bulto,
      precio: v.precio,
    };
    if (v.id) {
      const { error: upErr } = await supabase
        .from("producto_variantes")
        .update(payload)
        .eq("id", v.id);
      if (upErr) return { ok: false, error: upErr.message };
    } else {
      const { error: insErr } = await supabase
        .from("producto_variantes")
        .insert(payload);
      if (insErr) return { ok: false, error: insErr.message };
    }
  }

  revalidatePath("/productos");
  return { ok: true, data: undefined };
}

export async function deleteProducto(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "No se puede eliminar: el producto está usado en pedidos.",
      };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/productos");
  return { ok: true, data: undefined };
}

/** Guarda de una sola vez los cambios de precios de la planilla. */
export async function bulkUpdatePrecios(
  values: BulkPreciosValues,
): Promise<ActionResult<{ actualizados: number }>> {
  const parsed = bulkPreciosSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Hay precios inválidos en la planilla." };
  }
  const supabase = await createClient();
  let actualizados = 0;

  for (const p of parsed.data.productos) {
    const { error } = await supabase
      .from("productos")
      .update({ precio_base: p.precio_base })
      .eq("id", p.id);
    if (error) return { ok: false, error: error.message };
    actualizados++;
  }

  for (const v of parsed.data.variantes) {
    const { error } = await supabase
      .from("producto_variantes")
      .update({ precio: v.precio })
      .eq("id", v.id);
    if (error) return { ok: false, error: error.message };
    actualizados++;
  }

  revalidatePath("/productos");
  return { ok: true, data: { actualizados } };
}
