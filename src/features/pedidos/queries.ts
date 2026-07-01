import { createClient } from "@/lib/supabase/server";
import type {
  Pedido,
  PedidoItem,
  Cliente,
  HistorialEstado,
  Comprobante,
  EstadoPedido,
} from "@/types/database";

export type PedidoConCliente = Pedido & {
  clientes: Pick<Cliente, "id" | "razon_social"> | null;
};

export type PedidoDetalle = Pedido & {
  clientes: Cliente | null;
  pedido_items: PedidoItem[];
  historial_estado: HistorialEstado[];
  comprobantes: Comprobante[];
};

/** Lista de pedidos con datos básicos del cliente, filtrable por estado. */
export async function getPedidos(estado?: EstadoPedido): Promise<PedidoConCliente[]> {
  const supabase = await createClient();

  let query = supabase
    .from("pedidos")
    .select("*, clientes(id, razon_social)")
    .order("numero", { ascending: false });

  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query.returns<PedidoConCliente[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Pedido completo con cliente, ítems e historial de estados. */
export async function getPedido(id: string): Promise<PedidoDetalle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, clientes(*), pedido_items(*), historial_estado(*), comprobantes(*)")
    .eq("id", id)
    .order("created_at", { referencedTable: "pedido_items", ascending: true })
    .order("fecha", { referencedTable: "historial_estado", ascending: false })
    .order("fecha", { referencedTable: "comprobantes", ascending: false })
    .maybeSingle<PedidoDetalle>();

  if (error) throw new Error(error.message);
  return data;
}
