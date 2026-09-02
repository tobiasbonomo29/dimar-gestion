import { createClient } from "@/lib/supabase/server";
import type { Insumo, Compra, CompraItem } from "@/types/database";

/** Insumos de la unidad actual, ordenados por nombre. */
export async function getInsumos(): Promise<Insumo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insumos")
    .select("*")
    .order("nombre", { ascending: true })
    .order("presentacion", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type CompraConItems = Compra & { compra_items: CompraItem[] };

/** Compras de insumos de la unidad actual, más nuevas primero, con sus ítems. */
export async function getCompras(): Promise<CompraConItems[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compras")
    .select("*, compra_items(*)")
    .order("fecha", { ascending: false })
    .order("numero", { ascending: false })
    .returns<CompraConItems[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}
