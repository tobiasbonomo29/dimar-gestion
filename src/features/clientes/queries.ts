import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/types/database";

/**
 * Lista clientes, opcionalmente filtrando por razón social, contacto o email.
 * Ordena por fecha de alta descendente (los más nuevos primero).
 */
export async function getClientes(search?: string): Promise<Cliente[]> {
  const supabase = await createClient();

  let query = supabase
    .from("clientes")
    .select("*")
    .order("fecha_alta", { ascending: false });

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `razon_social.ilike.${term},nombre_contacto.ilike.${term},email.ilike.${term}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
