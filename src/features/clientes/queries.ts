import { createClient } from "@/lib/supabase/server";
import { ESTADOS_GENERAN_DEUDA } from "@/lib/constants";
import type { Cliente, Pago, Pedido } from "@/types/database";

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

export type SaldoCliente = {
  facturado: number;
  cobrado: number;
  saldo: number;
};

/**
 * Deuda/cobrado por cliente, agregado en dos queries livianas (una suma de
 * pedidos que generan deuda, una suma de pagos) en vez de traer todas las
 * filas al cliente. Devuelve un mapa cliente_id -> saldo; los clientes sin
 * movimientos no aparecen (tratar como saldo 0).
 */
export async function getSaldosPorCliente(): Promise<Map<string, SaldoCliente>> {
  const supabase = await createClient();
  const [pedidosRes, pagosRes] = await Promise.all([
    supabase.from("pedidos").select("cliente_id, total").in("estado", ESTADOS_GENERAN_DEUDA),
    supabase.from("pagos").select("cliente_id, monto"),
  ]);
  if (pedidosRes.error) throw new Error(pedidosRes.error.message);
  if (pagosRes.error) throw new Error(pagosRes.error.message);

  const mapa = new Map<string, SaldoCliente>();
  const get = (clienteId: string) => {
    let s = mapa.get(clienteId);
    if (!s) {
      s = { facturado: 0, cobrado: 0, saldo: 0 };
      mapa.set(clienteId, s);
    }
    return s;
  };

  for (const p of pedidosRes.data ?? []) {
    get(p.cliente_id).facturado += Number(p.total);
  }
  for (const p of pagosRes.data ?? []) {
    get(p.cliente_id).cobrado += Number(p.monto);
  }
  for (const s of mapa.values()) {
    s.saldo = s.facturado - s.cobrado;
  }
  return mapa;
}

export type ClienteConSaldo = Cliente & SaldoCliente;

/** Lista de clientes (con el mismo filtro de búsqueda que getClientes) con su saldo de cuenta corriente. */
export async function getClientesConSaldo(search?: string): Promise<ClienteConSaldo[]> {
  const [clientes, saldos] = await Promise.all([getClientes(search), getSaldosPorCliente()]);
  return clientes.map((c) => ({
    ...c,
    ...(saldos.get(c.id) ?? { facturado: 0, cobrado: 0, saldo: 0 }),
  }));
}

export type PedidoConSaldo = Pick<
  Pedido,
  "id" | "numero" | "fecha_creacion" | "estado" | "total"
> & {
  pagado: number;
  pendiente: number;
};

export type CuentaCorriente = {
  cliente: Cliente;
  pedidos: PedidoConSaldo[];
  pagos: Pago[];
  totalFacturado: number;
  totalCobrado: number;
  saldo: number;
};

/**
 * Cuenta corriente completa de un cliente: pedidos que generan deuda (desde
 * "facturado" en adelante, ver ESTADOS_GENERAN_DEUDA) con el pago asignado
 * por orden cronológico (FIFO: los pagos más viejos cubren primero los
 * pedidos más viejos) y el listado de pagos registrados.
 */
export async function getCuentaCorriente(clienteId: string): Promise<CuentaCorriente | null> {
  const supabase = await createClient();

  const [clienteRes, pedidosRes, pagosRes] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", clienteId).maybeSingle(),
    supabase
      .from("pedidos")
      .select("id, numero, fecha_creacion, estado, total")
      .eq("cliente_id", clienteId)
      .in("estado", ESTADOS_GENERAN_DEUDA)
      .order("fecha_creacion", { ascending: true }),
    supabase
      .from("pagos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("fecha", { ascending: false }),
  ]);

  if (clienteRes.error) throw new Error(clienteRes.error.message);
  if (!clienteRes.data) return null;
  if (pedidosRes.error) throw new Error(pedidosRes.error.message);
  if (pagosRes.error) throw new Error(pagosRes.error.message);

  const totalCobrado = (pagosRes.data ?? []).reduce((acc, p) => acc + Number(p.monto), 0);

  let disponible = totalCobrado;
  const pedidos: PedidoConSaldo[] = (pedidosRes.data ?? []).map((p) => {
    const total = Number(p.total);
    const pagado = Math.min(total, Math.max(disponible, 0));
    disponible -= pagado;
    return { ...p, total, pagado, pendiente: total - pagado };
  });

  const totalFacturado = pedidos.reduce((acc, p) => acc + p.total, 0);

  return {
    cliente: clienteRes.data,
    pedidos,
    pagos: pagosRes.data ?? [],
    totalFacturado,
    totalCobrado,
    saldo: totalFacturado - totalCobrado,
  };
}
