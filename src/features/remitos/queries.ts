import { createClient } from "@/lib/supabase/server";
import type { Remito, RemitoItem } from "@/types/database";

/** Renglón con el empaque del producto (si está vinculado al catálogo) para calcular bultos. */
export type RemitoItemConEmpaque = RemitoItem & {
  productos: { unidades_por_bulto: number | null; tipo_bulto: string | null } | null;
};

export type RemitoConItems = Remito & {
  remito_items: RemitoItemConEmpaque[];
};

/** Lista de remitos sueltos con sus ítems, más nuevos primero. */
export async function getRemitos(): Promise<RemitoConItems[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("remitos")
    .select("*, remito_items(*, productos(unidades_por_bulto, tipo_bulto))")
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
    .select("*, remito_items(*, productos(unidades_por_bulto, tipo_bulto))")
    .eq("id", id)
    .order("created_at", { referencedTable: "remito_items", ascending: true })
    .maybeSingle<RemitoConItems>();

  if (error) throw new Error(error.message);
  return data;
}
