import { createClient } from "@/lib/supabase/server";
import { ESTADOS_GENERAN_DEUDA } from "@/lib/constants";
import type {
  Pedido,
  PedidoItem,
  Cliente,
  HistorialEstado,
  Comprobante,
  EstadoPedido,
  Entrega,
  EntregaItem,
} from "@/types/database";

export type PedidoConCliente = Pedido & {
  clientes: Pick<
    Cliente,
    "id" | "razon_social" | "direccion" | "telefono" | "email" | "cuit" | "condicion_fiscal"
  > | null;
};

export type ComprobanteConPV = Comprobante & {
  puntos_venta: { numero: number; nombre: string | null } | null;
};

export type EntregaConItems = Entrega & { entrega_items: EntregaItem[] };

export type PedidoDetalle = Pedido & {
  clientes: Cliente | null;
  pedido_items: PedidoItem[];
  historial_estado: HistorialEstado[];
  comprobantes: ComprobanteConPV[];
  entregas: EntregaConItems[];
};

/** Lista de pedidos con datos básicos del cliente, filtrable por estado. */
export async function getPedidos(estado?: EstadoPedido): Promise<PedidoConCliente[]> {
  const supabase = await createClient();

  let query = supabase
    .from("pedidos")
    .select("*, clientes(id, razon_social, direccion, telefono, email, cuit, condicion_fiscal)")
    .order("numero", { ascending: false });

  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query.returns<PedidoConCliente[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type CobranzaPedido = { pagado: number; pendiente: number };

/**
 * Estado de cobro por pedido (para toda la cartera): imputa los pagos de cada
 * cliente por FIFO (los pedidos más viejos que generan deuda se cobran primero),
 * igual criterio que la cuenta corriente. Solo entran los pedidos en estado que
 * genera deuda (facturado en adelante); el resto no aparece en el mapa y se
 * trata como "sin facturar". Devuelve un objeto pedido_id -> { pagado, pendiente }.
 */
export async function getCobranzaPorPedido(): Promise<Record<string, CobranzaPedido>> {
  const supabase = await createClient();
  const [pedidosRes, pagosRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, cliente_id, total, fecha_creacion")
      .in("estado", ESTADOS_GENERAN_DEUDA)
      .order("fecha_creacion", { ascending: true }),
    supabase.from("pagos").select("cliente_id, monto"),
  ]);
  if (pedidosRes.error) throw new Error(pedidosRes.error.message);
  if (pagosRes.error) throw new Error(pagosRes.error.message);

  // Saldo disponible por cliente = suma de sus pagos.
  const disponible = new Map<string, number>();
  for (const p of pagosRes.data ?? []) {
    disponible.set(p.cliente_id, (disponible.get(p.cliente_id) ?? 0) + Number(p.monto));
  }

  // Los pedidos vienen ordenados por fecha asc, así que para cada cliente se
  // imputan de más viejo a más nuevo.
  const result: Record<string, CobranzaPedido> = {};
  for (const p of pedidosRes.data ?? []) {
    const total = Number(p.total);
    const disp = disponible.get(p.cliente_id) ?? 0;
    const pagado = Math.min(total, Math.max(disp, 0));
    disponible.set(p.cliente_id, disp - pagado);
    result[p.id] = { pagado, pendiente: total - pagado };
  }
  return result;
}

/** Pedido completo con cliente, ítems e historial de estados. */
export async function getPedido(id: string): Promise<PedidoDetalle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, clientes(*), pedido_items(*), historial_estado(*), comprobantes(*, puntos_venta(numero, nombre)), entregas(*, entrega_items(*))")
    .eq("id", id)
    .order("created_at", { referencedTable: "pedido_items", ascending: true })
    .order("fecha", { referencedTable: "historial_estado", ascending: false })
    .order("fecha", { referencedTable: "comprobantes", ascending: false })
    .order("fecha", { referencedTable: "entregas", ascending: false })
    .maybeSingle<PedidoDetalle>();

  if (error) throw new Error(error.message);
  return data;
}
