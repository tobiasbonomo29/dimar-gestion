"use client";

import * as React from "react";
import { toast } from "sonner";
import { Factory, FileSpreadsheet, FileDown, Loader2 } from "lucide-react";
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
import { useEmpresa } from "@/components/empresa-provider";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/export-excel";
import type { Reposicion } from "../queries";

export function ReposicionPanel({ data }: { data: Reposicion }) {
  const empresa = useEmpresa();
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const totalFalta = data.rows.reduce((a, r) => a + r.faltaProducir, 0);

  function exportExcel() {
    exportToExcel(
      data.rows.map((r) => ({
        Producto: r.codigo ? `${r.codigo} · ${r.nombre}` : r.nombre,
        "Stock actual": r.stock,
        [`Vendido (${data.meses} ${data.meses === 1 ? "mes" : "meses"})`]: r.vendido,
        "Venta por mes": Math.round(r.demandaMensual),
        "Cobertura (meses)": r.coberturaMeses != null ? Number(r.coberturaMeses.toFixed(2)) : "",
        "A producir (1 mes)": Math.ceil(r.faltaProducir),
      })),
      "reposicion-stock",
      "Reposición",
    );
  }

  async function exportPDF() {
    setPdfLoading(true);
    try {
      const [{ pdf }, { ReposicionPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./reposicion-pdf"),
      ]);
      const blob = await pdf(<ReposicionPDF data={data} empresa={empresa} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reposicion-stock-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Cuánto falta producir para cubrir <b>1 mes</b> de venta. La demanda mensual es el promedio
          vendido en el período ({data.meses} {data.meses === 1 ? "mes" : "meses"}). Cambialo con el
          selector de arriba.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={data.rows.length === 0 || pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={data.rows.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100">
            <Factory className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">A producir para cubrir 1 mes</p>
            <p className="text-2xl font-bold tabular-nums text-amber-700">{formatNumber(Math.ceil(totalFalta))} u.</p>
            <p className="text-xs text-muted-foreground">{data.totalFaltaItems} productos por debajo del mes de stock</p>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Stock actual</TableHead>
              <TableHead className="text-right">Venta / mes</TableHead>
              <TableHead className="text-right">Cobertura</TableHead>
              <TableHead className="text-right">A producir (1 mes)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No hay ventas facturadas en el período para calcular la demanda.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((r) => (
                <TableRow key={r.producto_id} className={cn(r.faltaProducir > 0 && "bg-amber-50/60")}>
                  <TableCell className="font-medium">{r.codigo ? `${r.codigo} · ` : ""}{r.nombre}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", r.stock <= 0 && "text-red-600")}>
                    {formatNumber(r.stock)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(Math.round(r.demandaMensual))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r.coberturaMeses != null ? `${r.coberturaMeses.toFixed(1)} m` : "—"}
                  </TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", r.faltaProducir > 0 ? "text-amber-700" : "text-muted-foreground")}>
                    {r.faltaProducir > 0 ? formatNumber(Math.ceil(r.faltaProducir)) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
