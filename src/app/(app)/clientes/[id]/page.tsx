import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wallet, CheckCircle2, AlertCircle, Receipt } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstadoBadge } from "@/components/estado-badge";
import { DescargarCuentaCorriente } from "@/features/clientes/components/descargar-cuenta-corriente";
import { PagosPanel } from "@/features/pagos/components/pagos-panel";
import { getCuentaCorriente } from "@/features/clientes/queries";
import { CONDICIONES_FISCALES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "danger" | "ok";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg",
            tone === "danger" ? "bg-red-100" : tone === "ok" ? "bg-green-100" : "bg-muted",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              tone === "danger"
                ? "text-red-600"
                : tone === "ok"
                  ? "text-green-600"
                  : "text-muted-foreground",
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cuenta = await getCuentaCorriente(id);
  if (!cuenta) notFound();

  const { cliente, pedidos, pagos, totalFacturado, totalCobrado, saldo } = cuenta;
  const pendientes = pedidos.filter((p) => p.pendiente > 0.01);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/clientes"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a clientes
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{cliente.razon_social}</h1>
          <p className="text-sm text-muted-foreground">
            {CONDICIONES_FISCALES[cliente.condicion_fiscal]}
            {cliente.cuit ? ` · CUIT ${cliente.cuit}` : ""}
          </p>
        </div>
        <DescargarCuentaCorriente cuenta={cuenta} />
      </div>

      {/* KPIs de cuenta corriente */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Facturado histórico" value={formatCurrency(totalFacturado)} icon={Receipt} />
        <Kpi label="Cobrado" value={formatCurrency(totalCobrado)} icon={CheckCircle2} tone="ok" />
        <Kpi
          label={saldo > 0 ? "Saldo adeudado" : "Saldo a favor"}
          value={formatCurrency(Math.abs(saldo))}
          icon={saldo > 0 ? AlertCircle : Wallet}
          tone={saldo > 0 ? "danger" : "ok"}
        />
        <Kpi label="Pedidos pendientes de cobro" value={String(pendientes.length)} icon={Wallet} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pedidos que generan deuda</CardTitle>
            </CardHeader>
            <CardContent>
              {pedidos.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Este cliente todavía no tiene pedidos facturados.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <Link href={`/pedidos/${p.id}`} className="hover:underline">
                            #{p.numero}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(p.fecha_creacion)}
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={p.estado} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(p.total)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCurrency(p.pagado)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.pendiente > 0.01 ? (
                            <span className="font-medium text-red-600">
                              {formatCurrency(p.pendiente)}
                            </span>
                          ) : (
                            <Badge className="border-green-200 bg-green-100 text-green-700">
                              Pagado
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos del cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {cliente.nombre_contacto && <p>{cliente.nombre_contacto}</p>}
              {cliente.email && <p className="text-muted-foreground">{cliente.email}</p>}
              {cliente.telefono && <p className="text-muted-foreground">{cliente.telefono}</p>}
              {cliente.direccion && <p className="text-muted-foreground">{cliente.direccion}</p>}
              {cliente.notas && (
                <p className="whitespace-pre-wrap pt-2 text-muted-foreground">{cliente.notas}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pagos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PagosPanel
                clienteId={cliente.id}
                pagos={pagos}
                pedidosPendientes={pendientes.map((p) => ({
                  id: p.id,
                  numero: p.numero,
                  pendiente: p.pendiente,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
