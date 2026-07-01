import { createClient } from "@/lib/supabase/server";
import type { EstadoPedido } from "@/types/database";
import type { PedidoConCliente } from "@/features/pedidos/queries";

export type DashboardData = {
  // Pedidos pendientes de respuesta = todavía en "cotizado".
  pendientesRespuesta: PedidoConCliente[];
  // Próximos a despachar: confirmados o en producción, ordenados por entrega.
  proximosDespachar: PedidoConCliente[];
  // Indicadores del mes en curso.
  pedidosDelMes: number;
  facturacionEstimadaMes: number; // suma de totales de pedidos del mes (excl. cancelados)
  // Conteo por estado (para un vistazo rápido).
  conteoPorEstado: Record<EstadoPedido, number>;
};

function inicioDeMes(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function getDashboard(): Promise<DashboardData> {
  const supabase = await createClient();
  const desde = inicioDeMes();

  const [pendientesRes, proximosRes, delMesRes, conteoRes] = await Promise.all([
    // Pendientes de respuesta (cotizados), más nuevos primero.
    supabase
      .from("pedidos")
      .select("*, clientes(id, razon_social)")
      .eq("estado", "cotizado")
      .order("fecha_creacion", { ascending: false })
      .limit(8)
      .returns<PedidoConCliente[]>(),
    // Próximos a despachar (confirmado / en producción) por fecha de entrega.
    supabase
      .from("pedidos")
      .select("*, clientes(id, razon_social)")
      .in("estado", ["confirmado", "en_produccion"])
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
    despachado: 0,
    facturado: 0,
    cancelado: 0,
  };
  for (const row of conteoRes.data ?? []) {
    conteoPorEstado[row.estado as EstadoPedido]++;
  }

  return {
    pendientesRespuesta: pendientesRes.data ?? [],
    proximosDespachar: proximosRes.data ?? [],
    pedidosDelMes: delMes.length,
    facturacionEstimadaMes,
    conteoPorEstado,
  };
}
