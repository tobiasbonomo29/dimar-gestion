"use client";

import { FileSpreadsheet, Boxes, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/export-excel";
import type { VentasPorProducto, StockInsumos } from "../queries";

export function EstadisticasPanel({
  ventas,
  stock,
}: {
  ventas: VentasPorProducto;
  stock: StockInsumos;
}) {
  function exportVentas() {
    const rows = ventas.productos.map((p) => {
      const row: Record<string, string | number> = { Producto: p.descripcion };
      for (const m of ventas.meses) row[m.label] = p.porMes[m.key]?.cantidad ?? 0;
      row["Cantidad total"] = p.totalCantidad;
      row["Monto total"] = p.totalMonto;
      return row;
    });
    exportToExcel(rows, "ventas-por-producto-mensual", "Ventas x producto");
  }

  function exportStock() {
    exportToExcel(
      stock.insumos.map((i) => ({
        Insumo: i.nombre,
        Presentación: i.presentacion ?? "",
        Stock: i.stock,
        Unidad: i.unidad_medida,
        Mínimo: i.stock_minimo,
        "Último precio": i.ultimoPrecio,
        "Valor stock": i.valor,
      })),
      "stock-insumos",
      "Stock insumos",
    );
  }

  return (
    <div className="space-y-6">
      {/* Ventas por producto (mensual) */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Ventas por producto (mensual)</CardTitle>
          <Button variant="outline" size="sm" onClick={exportVentas} disabled={ventas.productos.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Producto</TableHead>
                  {ventas.meses.map((m) => (
                    <TableHead key={m.key} className="text-right whitespace-nowrap capitalize">{m.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Cant. total</TableHead>
                  <TableHead className="text-right">Monto total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.productos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={ventas.meses.length + 3} className="h-24 text-center text-muted-foreground">
                      No hay ventas facturadas en el período.
                    </TableCell>
                  </TableRow>
                ) : (
                  ventas.productos.map((p) => (
                    <TableRow key={p.descripcion}>
                      <TableCell className="sticky left-0 bg-card font-medium">{p.descripcion}</TableCell>
                      {ventas.meses.map((m) => (
                        <TableCell key={m.key} className="text-right tabular-nums text-muted-foreground">
                          {p.porMes[m.key] ? formatNumber(p.porMes[m.key].cantidad) : "—"}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium tabular-nums">{formatNumber(p.totalCantidad)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(p.totalMonto)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <p className="-mt-4 text-xs text-muted-foreground">
        Cantidades vendidas por producto en cada mes del período (pedidos facturados). Usá el
        selector de período de arriba para cambiar el rango.
      </p>

      {/* Stock de insumos */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <Boxes className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Valor del stock de insumos</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(stock.totalValor)}</p>
              <p className="text-xs text-muted-foreground">{stock.insumos.length} insumos · al último precio de compra</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Bajo el mínimo</p>
              <p className="text-2xl font-bold tabular-nums text-amber-700">{stock.bajoMinimo}</p>
              <p className="text-xs text-muted-foreground">insumos a reponer</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Stock de insumos</CardTitle>
          <Button variant="outline" size="sm" onClick={exportStock} disabled={stock.insumos.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Últ. precio</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.insumos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No hay insumos cargados todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  stock.insumos.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{i.presentacion ?? "—"}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", i.bajo && "font-medium text-amber-700")}>
                        {formatNumber(i.stock)} {i.unidad_medida}
                        {i.bajo && <AlertTriangle className="ml-1 inline h-3.5 w-3.5" />}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {i.stock_minimo > 0 ? formatNumber(i.stock_minimo) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {i.ultimoPrecio > 0 ? formatCurrency(i.ultimoPrecio) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(i.valor)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <p className="-mt-4 text-xs text-muted-foreground">
        El valor se calcula con el último precio de compra de cada insumo. El stock es una foto del
        momento (no depende del período).
      </p>
    </div>
  );
}
