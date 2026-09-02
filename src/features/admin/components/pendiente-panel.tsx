"use client";

import { Factory, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/export-excel";
import type { PendienteProducto } from "../queries";

export function PendientePanel({ items }: { items: PendienteProducto[] }) {
  const totalPendiente = items.reduce((a, i) => a + i.pendiente, 0);
  const totalAProducir = items.reduce((a, i) => a + i.aProducir, 0);

  function descargarExcel() {
    exportToExcel(
      items.map((i) => ({
        Producto: i.descripcion,
        Pedidos: i.pedidos,
        "Pendiente (u.)": i.pendiente,
        Stock: i.stock ?? "",
        "A producir": i.aProducir,
      })),
      "pendiente-por-producto",
      "Pendiente",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Unidades pedidas y todavía no despachadas, agrupadas por producto (pedidos confirmados,
          facturados, en producción o listos para despachar).
        </p>
        <Button variant="outline" size="sm" onClick={descargarExcel} disabled={items.length === 0}>
          <FileSpreadsheet className="h-4 w-4" />
          Descargar Excel
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <Factory className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pendiente de entrega</p>
              <p className="text-2xl font-bold tabular-nums">{formatNumber(totalPendiente)} u.</p>
              <p className="text-xs text-muted-foreground">{items.length} productos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100">
              <Factory className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">A producir (falta stock)</p>
              <p className="text-2xl font-bold tabular-nums text-amber-700">
                {formatNumber(totalAProducir)} u.
              </p>
              <p className="text-xs text-muted-foreground">descontando el stock actual</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">A producir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No hay pedidos pendientes de entrega. 🎉
                </TableCell>
              </TableRow>
            ) : (
              items.map((i) => (
                <TableRow key={i.producto_id ?? i.descripcion}>
                  <TableCell className="font-medium">{i.descripcion}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{i.pedidos}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatNumber(i.pendiente)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {i.stock != null ? formatNumber(i.stock) : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      i.aProducir > 0 ? "text-amber-700" : "text-muted-foreground",
                    )}
                  >
                    {formatNumber(i.aProducir)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        “A producir” = pendiente − stock actual (cuando el producto es del catálogo). Los ítems de
        texto libre (sin producto) se muestran con su cantidad pendiente completa.
      </p>
    </div>
  );
}
