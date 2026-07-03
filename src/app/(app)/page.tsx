import Link from "next/link";
import { ClipboardList, Clock, Truck, DollarSign, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstadoBadge } from "@/components/estado-badge";
import { getDashboard } from "@/features/dashboard/queries";
import { ESTADOS_PEDIDO, ESTADOS_PEDIDO_LIST } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PedidoConCliente } from "@/features/pedidos/queries";

export const dynamic = "force-dynamic";

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PedidoMini({ p }: { p: PedidoConCliente }) {
  return (
    <Link
      href={`/pedidos/${p.id}`}
      className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-accent"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">
          #{p.numero} · {p.clientes?.razon_social ?? "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {p.fecha_estimada_entrega
            ? `Entrega: ${formatDate(p.fecha_estimada_entrega)}`
            : `Creado: ${formatDate(p.fecha_creacion)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="tabular-nums text-muted-foreground">{formatCurrency(p.total)}</span>
        <EstadoBadge estado={p.estado} />
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const data = await getDashboard();
  const mesActual = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground capitalize">{mesActual}</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label="Pendientes de respuesta"
          value={String(data.pendientesRespuesta.length)}
          icon={Clock}
          hint="En estado cotizado"
        />
        <Kpi
          label="Próximos a despachar"
          value={String(data.proximosDespachar.length)}
          icon={Truck}
          hint="Confirmados / en producción"
        />
        <Kpi
          label="Pedidos del mes"
          value={String(data.pedidosDelMes)}
          icon={ClipboardList}
          hint="Excluye cancelados"
        />
        <Kpi
          label="Facturación estimada"
          value={formatCurrency(data.facturacionEstimadaMes)}
          icon={DollarSign}
          hint="Total de pedidos del mes"
        />
        <Kpi
          label="Total por cobrar"
          value={formatCurrency(data.totalPorCobrar)}
          icon={AlertCircle}
          hint="Saldo pendiente de todos los clientes"
        />
      </div>

      {/* Conteo por estado */}
      <div className="flex flex-wrap gap-2">
        {ESTADOS_PEDIDO_LIST.map((e) => (
          <Link
            key={e}
            href="/pedidos"
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent"
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", ESTADOS_PEDIDO[e].dot)} />
            {ESTADOS_PEDIDO[e].label}
            <span className="font-semibold tabular-nums">{data.conteoPorEstado[e]}</span>
          </Link>
        ))}
      </div>

      {/* Listas accionables */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Pendientes de respuesta</CardTitle>
            <Link href="/pedidos" className="text-xs text-muted-foreground hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendientesRespuesta.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay cotizaciones pendientes. 🎉
              </p>
            ) : (
              data.pendientesRespuesta.map((p) => <PedidoMini key={p.id} p={p} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Próximos a despachar</CardTitle>
            <Link href="/pedidos" className="text-xs text-muted-foreground hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.proximosDespachar.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nada en producción por ahora.
              </p>
            ) : (
              data.proximosDespachar.map((p) => <PedidoMini key={p.id} p={p} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Clientes con más deuda</CardTitle>
            <Link href="/clientes" className="text-xs text-muted-foreground hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topDeudores.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay saldos pendientes. 🎉
              </p>
            ) : (
              data.topDeudores.map((d) => (
                <Link
                  key={d.cliente_id}
                  href={`/clientes/${d.cliente_id}`}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-accent"
                >
                  <span className="truncate font-medium">{d.razon_social}</span>
                  <span className="tabular-nums font-medium text-red-600">
                    {formatCurrency(d.saldo)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
