import { createClient } from "@/lib/supabase/server";
import type { Remito, RemitoItem } from "@/types/database";

export type RemitoConItems = Remito & {
  remito_items: RemitoItem[];
};

/** Lista de remitos sueltos con sus ítems, más nuevos primero. */
export async function getRemitos(): Promise<RemitoConItems[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("remitos")
    .select("*, remito_items(*)")
    .order("numero", { ascending: false })
    .order("created_at", { referencedTable: "remito_items", ascending: true })
    .returns<RemitoConItems[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Remito suelto individual con sus ítems. */
export async function getRemito(id: string): Promise<RemitoConItems | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("remitos")
    .select("*, remito_items(*)")
    .eq("id", id)
    .order("created_at", { referencedTable: "remito_items", ascending: true })
    .maybeSingle<RemitoConItems>();

  if (error) throw new Error(error.message);
  return data;
}
