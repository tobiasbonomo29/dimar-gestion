import { createClient } from "@/lib/supabase/server";
import type { RecetaItem, Produccion } from "@/types/database";

/** Todas las líneas de receta de la unidad (producto_id → insumo_id, cantidad por unidad). */
export async function getRecetaItems(): Promise<RecetaItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("receta_items").select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type ProduccionConProducto = Produccion & {
  productos: { codigo: string | null; nombre: string } | null;
};

/** Historial de producciones (más nuevas primero) con el nombre del producto. */
export async function getProducciones(): Promise<ProduccionConProducto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("producciones")
    .select("*, productos(codigo, nombre)")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<ProduccionConProducto[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}
