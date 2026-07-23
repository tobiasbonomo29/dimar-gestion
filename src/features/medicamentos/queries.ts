import { createClient } from "@/lib/supabase/server";
import type { Medicamento } from "@/types/database";

/** Lista de medicamentos de la unidad, con búsqueda por descripción, droga o Nº de registro. */
export async function getMedicamentos(search?: string, limit = 200): Promise<Medicamento[]> {
  const supabase = await createClient();
  let query = supabase
    .from("medicamentos")
    .select("*")
    .order("descripcion", { ascending: true })
    .limit(limit);

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `descripcion.ilike.${term},droga.ilike.${term},nro_registro.ilike.${term},laboratorio.ilike.${term}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Cantidad total de medicamentos cargados en la unidad. */
export async function getMedicamentosCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("medicamentos")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}
