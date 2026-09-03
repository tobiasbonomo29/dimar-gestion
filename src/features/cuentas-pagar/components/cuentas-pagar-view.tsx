"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Wallet, AlertTriangle, Clock, FileSpreadsheet, Trash2, HandCoins } from "lucide-react";

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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/export-excel";
import type { CuentasPagar, FacturaCompraRow, EstadoPago } from "../queries";
import { FacturaCompraFormDialog } from "./factura-compra-form-dialog";
import { PagoCompraDialog } from "./pago-compra-dialog";
import { eliminarFacturaCompra } from "../actions";

const BADGE: Record<EstadoPago, string> = {
  pagada: "bg-green-100 text-green-700 border-green-200",
  vencido: "bg-red-100 text-red-700 border-red-200",
  por_vencer: "bg-amber-100 text-amber-800 border-amber-200",
  al_dia: "bg-slate-100 text-slate-600 border-slate-200",
};

function estadoTexto(f: FacturaCompraRow): string {
  if (f.estado === "pagada") return "Pagada";
  if (f.estado === "vencido") {
    const d = Math.abs(f.diasParaVencer ?? 0);
    return d === 0 ? "Vence hoy" : `Vencida hace ${d} ${d === 1 ? "día" : "días"}`;
  }
  if (f.estado === "por_vencer") {
    return f.diasParaVencer === 0 ? "Vence hoy" : `Vence en ${f.diasParaVencer} ${f.diasParaVencer === 1 ? "día" : "días"}`;
  }
  return "A pagar";
}

export function CuentasPagarView({ data }: { data: CuentasPagar }) {
  const router = useRouter();
  const [nueva, setNueva] = React.useState(false);
  const [pagar, setPagar] = React.useState<FacturaCompraRow | null>(null);
  const [borrar, setBorrar] = React.useState<FacturaCompraRow | null>(null);

  async function handleBorrar() {
    if (!borrar) return;
    const r = await eliminarFacturaCompra(borrar.id);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Factura eliminada");
    router.refresh();
  }

  function exportar() {
    exportToExcel(
      data.facturas.map((f) => ({
        Proveedor: f.proveedor,
        "N°": f.numero ?? "",
        Fecha: formatDate(f.fecha),
        Vencimiento: f.vencimiento ? formatDate(f.vencimiento) : "",
        Estado: estadoTexto(f),
        Monto: f.monto,
        Pagado: f.pagado,
        Saldo: f.saldo,
      })),
      "cuentas-a-pagar",
      "Cuentas a pagar",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Facturas de compra y cuánto le debés a cada proveedor.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportar} disabled={data.facturas.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button size="sm" onClick={() => setNueva(true)}>
            <Plus className="h-4 w-4" />
            Nueva factura
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total a pagar</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(data.totalAPagar)}</p>
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
              <p className="text-2xl font-bold tabular-nums text-red-600">{formatCurrency(data.totalVencido)}</p>
              <p className="text-xs text-muted-foreground">a pagar ya</p>
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
              <p className="text-2xl font-bold tabular-nums text-amber-700">{formatCurrency(data.totalPorVencer)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cuánto le debo a cada proveedor */}
      {data.porProveedor.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cuánto le debo a cada proveedor</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Facturas impagas</TableHead>
                  <TableHead className="text-right">Saldo a pagar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.porProveedor.map((p) => (
                  <TableRow key={p.proveedor}>
                    <TableCell className="font-medium">{p.proveedor}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{p.facturas}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(p.saldo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Facturas */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>N°</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.facturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Todavía no cargaste facturas de compra. Empezá con “Nueva factura”.
                </TableCell>
              </TableRow>
            ) : (
              data.facturas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.proveedor}</TableCell>
                  <TableCell className="text-muted-foreground">{f.numero ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(f.fecha)}</TableCell>
                  <TableCell className="text-muted-foreground">{f.vencimiento ? formatDate(f.vencimiento) : "—"}</TableCell>
                  <TableCell>
                    <span className={cn("inline-block rounded-full border px-2 py-0.5 text-xs font-medium", BADGE[f.estado])}>
                      {estadoTexto(f)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(f.monto)}</TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", f.estado === "vencido" && "text-red-600")}>
                    {formatCurrency(f.saldo)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {f.saldo > 0.01 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPagar(f)} aria-label="Registrar pago">
                          <HandCoins className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setBorrar(f)} aria-label="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FacturaCompraFormDialog open={nueva} onOpenChange={setNueva} />
      <PagoCompraDialog factura={pagar} onOpenChange={() => setPagar(null)} />
      <ConfirmDialog
        open={borrar !== null}
        onOpenChange={(o) => !o && setBorrar(null)}
        title="Eliminar factura de compra"
        description={borrar ? `Se eliminará la factura de ${borrar.proveedor} (${formatCurrency(borrar.monto)}) y sus pagos.` : undefined}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleBorrar}
      />
    </div>
  );
}
