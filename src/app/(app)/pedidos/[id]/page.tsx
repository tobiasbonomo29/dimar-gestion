import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstadoBadge } from "@/components/estado-badge";
import { CambiarEstado } from "@/features/pedidos/components/cambiar-estado";
import { DescargarCotizacion } from "@/features/pedidos/components/descargar-cotizacion";
import { ComprobantesPanel } from "@/features/pedidos/components/comprobantes-panel";
import { EntregasPanel } from "@/features/pedidos/components/entregas-panel";
import { getPedido } from "@/features/pedidos/queries";
import { getPuntosVenta } from "@/features/puntos-venta/queries";
import { CONDICIONES_FISCALES, ORIGENES_PEDIDO } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pedido, puntosVenta] = await Promise.all([getPedido(id), getPuntosVenta(true)]);
  if (!pedido) notFound();

  const cliente = pedido.clientes;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/pedidos"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a pedidos
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Pedido #{pedido.numero}</h1>
            <EstadoBadge estado={pedido.estado} />
          </div>
          <p className="text-sm text-muted-foreground">
            Creado el {formatDate(pedido.fecha_creacion)}
            {pedido.origen ? ` · Origen: ${ORIGENES_PEDIDO[pedido.origen]}` : ""}
          </p>
        </div>
        <DescargarCotizacion pedido={pedido} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Ítems */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ítems</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Entregado</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-right">Precio unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedido.pedido_items.map((it) => {
                    const pend = Number(it.cantidad) - Number(it.cantidad_entregada);
                    return (
                      <TableRow key={it.id}>
                        <TableCell>{it.descripcion}</TableCell>
                        <TableCell className="text-right tabular-nums">{it.cantidad}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {it.cantidad_entregada}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {pend > 0 ? pend : <span className="text-[var(--viz-pos,#0ca30c)]">0</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(it.precio_unitario)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(it.subtotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 space-y-1 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Neto</span>
                  <span className="tabular-nums">{formatCurrency(pedido.subtotal)}</span>
                </div>
                {pedido.descuento_monto > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Descuento ({pedido.descuento_porcentaje}%)
                    </span>
                    <span className="tabular-nums">−{formatCurrency(pedido.descuento_monto)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    IVA ({pedido.iva_porcentaje}%)
                  </span>
                  <span className="tabular-nums">{formatCurrency(pedido.iva_monto)}</span>
                </div>
                <div className="flex justify-between pt-1 text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(pedido.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {pedido.notas && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">{pedido.notas}</CardContent>
            </Card>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <CambiarEstado pedidoId={pedido.id} estadoActual={pedido.estado} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comprobantes</CardTitle>
            </CardHeader>
            <CardContent>
              <ComprobantesPanel pedido={pedido} puntosVenta={puntosVenta} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entregas</CardTitle>
            </CardHeader>
            <CardContent>
              <EntregasPanel pedido={pedido} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{cliente?.razon_social ?? "—"}</p>
              {cliente?.nombre_contacto && <p>{cliente.nombre_contacto}</p>}
              {cliente?.email && <p className="text-muted-foreground">{cliente.email}</p>}
              {cliente?.telefono && <p className="text-muted-foreground">{cliente.telefono}</p>}
              {cliente && (
                <p className="text-muted-foreground">
                  {CONDICIONES_FISCALES[cliente.condicion_fiscal]}
                  {cliente.cuit ? ` · ${cliente.cuit}` : ""}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entrega</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <span className="text-muted-foreground">Fecha estimada: </span>
              {formatDate(pedido.fecha_estimada_entrega)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de estados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pedido.historial_estado.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin movimientos.</p>
              ) : (
                pedido.historial_estado.map((h) => (
                  <div key={h.id} className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <EstadoBadge estado={h.estado_nuevo} />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(h.fecha)}
                      </span>
                    </div>
                    {h.nota && <p className="pl-1 text-xs text-muted-foreground">{h.nota}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
