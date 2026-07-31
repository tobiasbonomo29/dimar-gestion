"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
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
import type { FacturaImpaga } from "../queries";

export function PorCobrarPanel({ facturas }: { facturas: FacturaImpaga[] }) {
  const totalSaldo = facturas.reduce((a, f) => a + f.saldo, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pendiente de cobro</p>
            <p className="text-2xl font-bold tabular-nums text-red-600">{formatCurrency(totalSaldo)}</p>
            <p className="text-xs text-muted-foreground">
              {facturas.length} {facturas.length === 1 ? "factura impaga" : "facturas impagas"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">N°</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                  <TableCell className="text-right tabular-nums">{formatCurrency(f.total)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatCurrency(f.pagado)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-red-600">{formatCurrency(f.saldo)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Considera pagos asociados a cada factura. Si registraste un pago general del cliente
        (sin factura puntual), esa factura puede figurar acá igual.
      </p>
    </div>
  );
}
