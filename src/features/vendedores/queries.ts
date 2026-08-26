import { createClient } from "@/lib/supabase/server";
import type { Vendedor } from "@/types/database";

/** Vendedores de la unidad actual (ordenados por nombre). */
export async function getVendedores(soloActivos = false): Promise<Vendedor[]> {
  const supabase = await createClient();
  let query = supabase.from("vendedores").select("*").order("nombre", { ascending: true });
  if (soloActivos) query = query.eq("activo", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
