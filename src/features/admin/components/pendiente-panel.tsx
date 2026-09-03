"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Factory, FileSpreadsheet, FileDown, ChevronRight, Loader2 } from "lucide-react";
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
import { ESTADOS_PEDIDO } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/export-excel";
import type { PendienteProducto } from "../queries";

export function PendientePanel({ items }: { items: PendienteProducto[] }) {
  const empresa = useEmpresa();
  const [abierto, setAbierto] = React.useState<Set<string>>(new Set());
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const totalPendiente = items.reduce((a, i) => a + i.pendiente, 0);

  async function descargarPDF() {
    setPdfLoading(true);
    try {
      const [{ pdf }, { PendientePDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pendiente-pdf"),
      ]);
      const blob = await pdf(<PendientePDF items={items} empresa={empresa} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pendiente-produccion-${new Date().toISOString().slice(0, 10)}.pdf`;
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

  function toggle(key: string) {
    setAbierto((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function descargarExcel() {
    // Detalle plano: una fila por producto + pedido.
    const rows = items.flatMap((i) =>
      i.detalle.map((d) => ({
        Producto: i.descripcion,
        "N° pedido": d.numero,
        Cliente: d.cliente,
        Cargado: formatDate(d.fecha),
        Estado: ESTADOS_PEDIDO[d.estado].label,
        Cantidad: d.cantidad,
      })),
    );
    exportToExcel(rows, "pendiente-por-producto", "Pendiente");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Unidades pedidas y todavía no despachadas, por producto. Solo pedidos{" "}
          <b>confirmados o facturados</b>. Tocá una fila para ver a qué cliente y pedido corresponde.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={descargarPDF} disabled={items.length === 0 || pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={descargarExcel} disabled={items.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[36px]" />
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No hay pedidos confirmados ni facturados pendientes de entrega. 🎉
                </TableCell>
              </TableRow>
            ) : (
              items.map((i) => {
                const key = i.producto_id ?? i.descripcion;
                const open = abierto.has(key);
                return (
                  <React.Fragment key={key}>
                    <TableRow className="cursor-pointer" onClick={() => toggle(key)}>
                      <TableCell>
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} />
                      </TableCell>
                      <TableCell className="font-medium">{i.descripcion}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{i.pedidos}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatNumber(i.pendiente)}</TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell />
                        <TableCell colSpan={3} className="p-0">
                          <div className="rounded-md border bg-muted/30 my-1">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="h-8">Pedido</TableHead>
                                  <TableHead className="h-8">Cliente</TableHead>
                                  <TableHead className="h-8">Cargado</TableHead>
                                  <TableHead className="h-8">Estado</TableHead>
                                  <TableHead className="h-8 text-right">Cantidad</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {i.detalle.map((d, idx) => (
                                  <TableRow key={`${d.pedido_id}-${idx}`} className="hover:bg-transparent">
                                    <TableCell className="py-1.5">
                                      <Link href={`/pedidos/${d.pedido_id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                                        #{d.numero}
                                      </Link>
                                    </TableCell>
                                    <TableCell className="py-1.5">{d.cliente}</TableCell>
                                    <TableCell className="py-1.5 text-muted-foreground">{formatDate(d.fecha)}</TableCell>
                                    <TableCell className="py-1.5 text-muted-foreground">{ESTADOS_PEDIDO[d.estado].label}</TableCell>
                                    <TableCell className="py-1.5 text-right tabular-nums">{formatNumber(d.cantidad)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
