import { createClient } from "@/lib/supabase/server";
import type { Producto, ProductoVariante } from "@/types/database";

export type ProductoConVariantes = Producto & {
  producto_variantes: ProductoVariante[];
};

/** Categorías de la unidad actual (para el selector del formulario de producto). */
export async function getCategorias(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categorias")
    .select("nombre")
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => c.nombre);
}

/** Lista productos con sus variantes, filtrando opcionalmente por texto o categoría. */
export async function getProductos(opts?: {
  search?: string;
  categoria?: string;
}): Promise<ProductoConVariantes[]> {
  const supabase = await createClient();

  let query = supabase
    .from("productos")
    .select("*, producto_variantes(*)")
    .order("nombre", { ascending: true })
    .order("nombre", { ascending: true, referencedTable: "producto_variantes" });

  if (opts?.search?.trim()) {
    query = query.ilike("nombre", `%${opts.search.trim()}%`);
  }
  if (opts?.categoria) {
    query = query.eq("categoria", opts.categoria);
  }

  const { data, error } = await query.returns<ProductoConVariantes[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProducto(id: string): Promise<ProductoConVariantes | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("*, producto_variantes(*)")
    .eq("id", id)
    .maybeSingle<ProductoConVariantes>();

  if (error) throw new Error(error.message);
  return data;
}
