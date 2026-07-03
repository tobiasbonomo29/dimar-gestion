import { createClient } from "@/lib/supabase/server";
import { getSaldosPorCliente } from "@/features/clientes/queries";
import type { EstadoPedido } from "@/types/database";
import type { PedidoConCliente } from "@/features/pedidos/queries";

export type DeudorTop = {
  cliente_id: string;
  razon_social: string;
  saldo: number;
};

export type DashboardData = {
  // Pedidos pendientes de respuesta = todavía en "cotizado".
  pendientesRespuesta: PedidoConCliente[];
  // Próximos a despachar: confirmados, facturados, en producción o listos para despachar, ordenados por entrega.
  proximosDespachar: PedidoConCliente[];
  // Indicadores del mes en curso.
  pedidosDelMes: number;
  facturacionEstimadaMes: number; // suma de totales de pedidos del mes (excl. cancelados)
  // Conteo por estado (para un vistazo rápido).
  conteoPorEstado: Record<EstadoPedido, number>;
  // Cuenta corriente: total pendiente de cobro y los clientes con mayor deuda.
  totalPorCobrar: number;
  topDeudores: DeudorTop[];
};

function inicioDeMes(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function getDashboard(): Promise<DashboardData> {
  const supabase = await createClient();
  const desde = inicioDeMes();

  const [pendientesRes, proximosRes, delMesRes, conteoRes, saldos] = await Promise.all([
    // Pendientes de respuesta (cotizados), más nuevos primero.
    supabase
      .from("pedidos")
      .select("*, clientes(id, razon_social)")
      .eq("estado", "cotizado")
      .order("fecha_creacion", { ascending: false })
      .limit(8)
      .returns<PedidoConCliente[]>(),
    // Próximos a despachar (confirmado / facturado / en producción / listo para despachar) por fecha de entrega.
    supabase
      .from("pedidos")
      .select("*, clientes(id, razon_social)")
      .in("estado", ["confirmado", "facturado", "en_produccion", "listo_despachar"])
      .order("fecha_estimada_entrega", { ascending: true, nullsFirst: false })
      .limit(8)
      .returns<PedidoConCliente[]>(),
    // Pedidos del mes (excluye cancelados) — traigo total y estado para agregar.
    supabase
      .from("pedidos")
      .select("total, estado")
      .gte("fecha_creacion", desde)
      .neq("estado", "cancelado"),
    // Conteo por estado (todos).
    supabase.from("pedidos").select("estado"),
    // Saldo de cuenta corriente por cliente (para el resumen de cobranzas).
    getSaldosPorCliente(),
  ]);

  if (pendientesRes.error) throw new Error(pendientesRes.error.message);
  if (proximosRes.error) throw new Error(proximosRes.error.message);
  if (delMesRes.error) throw new Error(delMesRes.error.message);
  if (conteoRes.error) throw new Error(conteoRes.error.message);

  const delMes = delMesRes.data ?? [];
  const facturacionEstimadaMes = delMes.reduce((acc, p) => acc + Number(p.total), 0);

  const conteoPorEstado: Record<EstadoPedido, number> = {
    cotizado: 0,
    confirmado: 0,
    en_produccion: 0,
    listo_despachar: 0,
    despachado: 0,
    facturado: 0,
    cancelado: 0,
  };
  for (const row of conteoRes.data ?? []) {
    conteoPorEstado[row.estado as EstadoPedido]++;
  }

  const deudoresIds = [...saldos.entries()]
    .filter(([, s]) => s.saldo > 0.01)
    .sort((a, b) => b[1].saldo - a[1].saldo)
    .slice(0, 5);
  const totalPorCobrar = [...saldos.values()].reduce(
    (acc, s) => acc + Math.max(s.saldo, 0),
    0,
  );

  let topDeudores: DeudorTop[] = [];
  if (deudoresIds.length > 0) {
    const { data: clientesData, error: clientesErr } = await supabase
      .from("clientes")
      .select("id, razon_social")
      .in("id", deudoresIds.map(([id]) => id));
    if (clientesErr) throw new Error(clientesErr.message);
    const nombres = new Map((clientesData ?? []).map((c) => [c.id, c.razon_social]));
    topDeudores = deudoresIds.map(([cliente_id, s]) => ({
      cliente_id,
      razon_social: nombres.get(cliente_id) ?? "—",
      saldo: s.saldo,
    }));
  }

  return {
    pendientesRespuesta: pendientesRes.data ?? [],
    proximosDespachar: proximosRes.data ?? [],
    pedidosDelMes: delMes.length,
    facturacionEstimadaMes,
    conteoPorEstado,
    totalPorCobrar,
    topDeudores,
  };
}
