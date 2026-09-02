"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, Clock, FileSpreadsheet } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/export-excel";
import type { EstadoVencimiento, FacturaImpaga } from "../queries";

function estadoTexto(f: FacturaImpaga): string {
  if (f.estado === "vencido") {
    const d = Math.abs(f.diasParaVencer);
    return d === 0 ? "Vence hoy" : `Vencida hace ${d} ${d === 1 ? "día" : "días"}`;
  }
  if (f.estado === "por_vencer") {
    return f.diasParaVencer === 0 ? "Vence hoy" : `Vence en ${f.diasParaVencer} ${f.diasParaVencer === 1 ? "día" : "días"}`;
  }
  return "Al día";
}

const BADGE: Record<EstadoVencimiento, string> = {
  vencido: "bg-red-100 text-red-700 border-red-200",
  por_vencer: "bg-amber-100 text-amber-800 border-amber-200",
  al_dia: "bg-slate-100 text-slate-600 border-slate-200",
};

export function PorCobrarPanel({ facturas }: { facturas: FacturaImpaga[] }) {
  const totalSaldo = facturas.reduce((a, f) => a + f.saldo, 0);
  const totalVencido = facturas.filter((f) => f.estado === "vencido").reduce((a, f) => a + f.saldo, 0);
  const totalPorVencer = facturas.filter((f) => f.estado === "por_vencer").reduce((a, f) => a + f.saldo, 0);

  function descargarExcel() {
    exportToExcel(
      facturas.map((f) => ({
        "N°": f.numero,
        Cliente: f.razon_social,
        Fecha: formatDate(f.fecha),
        Vencimiento: formatDate(f.vencimiento),
        Estado: estadoTexto(f),
        Total: f.total,
        Pagado: f.pagado,
        Saldo: f.saldo,
      })),
      "por-cobrar",
      "Por cobrar",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Facturas pendientes de cobro.</p>
        <Button variant="outline" size="sm" onClick={descargarExcel} disabled={facturas.length === 0}>
          <FileSpreadsheet className="h-4 w-4" />
          Descargar Excel
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pendiente total</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalSaldo)}</p>
              <p className="text-xs text-muted-foreground">
                {facturas.length} {facturas.length === 1 ? "factura" : "facturas"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Vencido</p>
              <p className="text-2xl font-bold tabular-nums text-red-600">{formatCurrency(totalVencido)}</p>
              <p className="text-xs text-muted-foreground">a cobrar ya</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Por vencer (7 días)</p>
              <p className="text-2xl font-bold tabular-nums text-amber-700">{formatCurrency(totalPorVencer)}</p>
              <p className="text-xs text-muted-foreground">próximas a vencer</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">N°</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No hay facturas pendientes de cobro. 🎉
                </TableCell>
              </TableRow>
            ) : (
              facturas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    <Link href={`/pedidos/${f.id}`} className="hover:underline">#{f.numero}</Link>
                  </TableCell>
                  <TableCell>{f.razon_social}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(f.fecha)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(f.vencimiento)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
                        BADGE[f.estado],
                      )}
                    >
                      {estadoTexto(f)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(f.total)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatCurrency(f.pagado)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      f.estado === "vencido" ? "text-red-600" : "",
                    )}
                  >
                    {formatCurrency(f.saldo)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        El vencimiento sale de la condición de pago de cada cliente (fecha de la factura + días de
        plazo). Los pagos se imputan de la factura más vieja a la más nueva.
      </p>
    </div>
  );
}
