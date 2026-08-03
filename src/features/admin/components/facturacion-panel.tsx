"use client";

import * as React from "react";
import { Users, Package, TrendingUp, FileSpreadsheet } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatNumber } from "@/lib/format";
import { exportSheetsToExcel } from "@/lib/export-excel";
import type { Facturacion } from "../queries";

export function FacturacionPanel({
  facturacion,
  desde,
  hasta,
}: {
  facturacion: Facturacion;
  desde: string;
  hasta: string;
}) {
  function descargarExcel() {
    exportSheetsToExcel(
      [
        {
          name: "Resumen",
          rows: [
            { Concepto: "Período", Valor: `${desde} a ${hasta}` },
            { Concepto: "Total facturado", Valor: facturacion.total },
            { Concepto: "Cantidad de facturas", Valor: facturacion.cantFacturas },
            { Concepto: "Clientes", Valor: facturacion.porCliente.length },
          ],
        },
        {
          name: "Por cliente",
          rows: facturacion.porCliente.map((c) => ({
            Cliente: c.razon_social,
            CUIT: c.cuit ?? "",
            Facturas: c.cantidad,
            Facturado: c.monto,
          })),
        },
        {
          name: "Por producto",
          rows: facturacion.porProducto.map((p) => ({
            Producto: p.descripcion,
            Cantidad: p.cantidad,
            Facturado: p.monto,
          })),
        },
      ],
      `facturacion-${desde}_${hasta}`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Facturado del período {desde} a {hasta}.
        </p>
        <Button variant="outline" size="sm" onClick={descargarExcel}>
          <FileSpreadsheet className="h-4 w-4" />
          Descargar Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total facturado</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(facturacion.total)}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {facturacion.cantFacturas} {facturacion.cantFacturas === 1 ? "factura" : "facturas"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Clientes</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{facturacion.porCliente.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Productos distintos</span>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{facturacion.porProducto.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cliente">
        <TabsList>
          <TabsTrigger value="cliente">Por cliente</TabsTrigger>
          <TabsTrigger value="producto">Por producto</TabsTrigger>
        </TabsList>

        <TabsContent value="cliente">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Facturación por cliente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CUIT</TableHead>
                    <TableHead className="text-right">Facturas</TableHead>
                    <TableHead className="text-right">Facturado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturacion.porCliente.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Sin facturación en el período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    facturacion.porCliente.map((c) => (
                      <TableRow key={c.cliente_id}>
                        <TableCell className="font-medium">{c.razon_social}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{c.cuit ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{c.cantidad}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(c.monto)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="producto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Facturación por producto</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto / ítem</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Facturado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturacion.porProducto.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        Sin ítems facturados en el período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    facturacion.porProducto.map((p) => (
                      <TableRow key={p.descripcion}>
                        <TableCell className="font-medium">{p.descripcion}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{formatNumber(p.cantidad)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(p.monto)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
