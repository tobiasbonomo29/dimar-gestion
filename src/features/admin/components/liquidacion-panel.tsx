"use client";

import * as React from "react";
import { toast } from "sonner";
import { Users, Percent, TrendingUp, FileSpreadsheet, FileDown, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { exportSheetsToExcel } from "@/lib/export-excel";
import type { Vendedor } from "@/types/database";
import type { Liquidacion, LiquidacionVendedor } from "../queries";

const TODOS = "__todos__";

export function LiquidacionPanel({
  liquidacion,
  vendedores,
  desde,
  hasta,
}: {
  liquidacion: Liquidacion;
  vendedores: Vendedor[];
  desde: string;
  hasta: string;
}) {
  const [filtro, setFiltro] = React.useState<string>(TODOS);
  const [pdfLoading, setPdfLoading] = React.useState<string | null>(null);

  const visibles = React.useMemo(
    () =>
      filtro === TODOS
        ? liquidacion.vendedores
        : liquidacion.vendedores.filter((v) => v.vendedor_id === filtro),
    [filtro, liquidacion.vendedores],
  );

  const totalNeto = visibles.reduce((a, v) => a + v.netoTotal, 0);
  const totalComision = visibles.reduce((a, v) => a + v.comisionTotal, 0);

  function excelVendedor(v: LiquidacionVendedor) {
    exportSheetsToExcel(
      [
        {
          name: "Resumen",
          rows: [
            { Concepto: "Vendedor", Valor: v.nombre },
            { Concepto: "Período", Valor: `${desde} a ${hasta}` },
            { Concepto: "Comisión %", Valor: v.comision_porcentaje },
            { Concepto: "Pedidos facturados", Valor: v.cantPedidos },
            { Concepto: "Neto sin IVA", Valor: v.netoTotal },
            { Concepto: "Comisión a liquidar", Valor: v.comisionTotal },
          ],
        },
        {
          name: "Detalle",
          rows: v.pedidos.map((p) => ({
            Fecha: formatDate(p.fecha),
            Pedido: p.numero,
            Cliente: p.razon_social,
            CUIT: p.cuit ?? "",
            Total: p.total,
            "Neto s/IVA": p.neto,
            Comisión: p.comision,
          })),
        },
      ],
      `liquidacion-${v.nombre.replace(/\s+/g, "_")}-${desde}_${hasta}`,
    );
  }

  async function pdfVendedor(v: LiquidacionVendedor) {
    setPdfLoading(v.vendedor_id);
    try {
      const [{ pdf }, { LiquidacionPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./liquidacion-pdf"),
      ]);
      const blob = await pdf(<LiquidacionPDF vendedor={v} desde={desde} hasta={hasta} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `liquidacion-${v.nombre.replace(/\s+/g, "_")}-${desde}_${hasta}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setPdfLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Comisión sobre la venta sin impuestos (neto) de los pedidos facturados del período {desde} a {hasta}.
        </p>
        <div className="w-full sm:w-64">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los vendedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los vendedores</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Comisión total</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(totalComision)}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              sobre {formatCurrency(totalNeto)} de neto
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Vendedores</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{visibles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Sin vendedor</span>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{liquidacion.sinVendedor.cantPedidos}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatCurrency(liquidacion.sinVendedor.netoTotal)} sin asignar
            </p>
          </CardContent>
        </Card>
      </div>

      {visibles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No hay pedidos facturados con vendedor asignado en el período.
          </CardContent>
        </Card>
      ) : (
        visibles.map((v) => (
          <Card key={v.vendedor_id}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">{v.nombre}</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {v.cantPedidos} pedido(s) · comisión {v.comision_porcentaje}% ·{" "}
                  <span className="font-semibold text-foreground">{formatCurrency(v.comisionTotal)}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => excelVendedor(v)}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pdfVendedor(v)}
                  disabled={pdfLoading === v.vendedor_id}
                >
                  {pdfLoading === v.vendedor_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Neto s/IVA</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {v.pedidos.map((p) => (
                    <TableRow key={p.pedido_id}>
                      <TableCell className="text-muted-foreground">{formatDate(p.fecha)}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">#{p.numero}</TableCell>
                      <TableCell className="font-medium">{p.razon_social}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(p.neto)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(p.comision)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={3} className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(v.netoTotal)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(v.comisionTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
