import { createClient } from "@/lib/supabase/server";
import type { PuntoVenta } from "@/types/database";

/** Puntos de venta de la unidad actual (ordenados por número). */
export async function getPuntosVenta(soloActivos = false): Promise<PuntoVenta[]> {
  const supabase = await createClient();
  let query = supabase.from("puntos_venta").select("*").order("numero", { ascending: true });
  if (soloActivos) query = query.eq("activo", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
