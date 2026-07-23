"use client";

import { TrendingUp, TrendingDown, ShoppingCart, Receipt, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EstadoResultados } from "../queries";
import { BarrasMensual, BarrasResultado, DonutCategorias } from "./charts";

function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "pos" | "neg";
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div
          className={cn(
            "mt-1 text-2xl font-bold tabular-nums",
            tone === "pos" && "text-[var(--viz-pos)]",
            tone === "neg" && "text-[var(--viz-neg)]",
          )}
        >
          {value}
        </div>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function EstadoResultadosPanel({ estado }: { estado: EstadoResultados }) {
  const resultadoPos = estado.resultado >= 0;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Ventas"
          value={formatCurrency(estado.ventas)}
          icon={TrendingUp}
          hint={`${estado.cantVentas} ${estado.cantVentas === 1 ? "pedido facturado" : "pedidos facturados"}`}
        />
        <KpiTile label="Compras" value={formatCurrency(estado.compras)} icon={ShoppingCart} />
        <KpiTile label="Erogaciones" value={formatCurrency(estado.erogaciones)} icon={Receipt} />
        <KpiTile
          label="Resultado"
          value={formatCurrency(estado.resultado)}
          icon={resultadoPos ? TrendingUp : TrendingDown}
          tone={resultadoPos ? "pos" : "neg"}
          hint={estado.ventas > 0 ? `Margen ${(estado.margen * 100).toFixed(1)}%` : undefined}
        />
      </div>

      {/* Ventas vs egresos por mes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas vs. egresos por mes</CardTitle>
        </CardHeader>
        <CardContent>
          <BarrasMensual data={estado.mensual} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <BarrasResultado data={estado.mensual} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Egresos por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutCategorias data={estado.porCategoria} />
          </CardContent>
        </Card>
      </div>

      {/* Tabla P&L mensual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle mensual</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">Erogaciones</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estado.mensual.map((m) => (
                <TableRow key={m.mes}>
                  <TableCell className="font-medium">{m.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(m.ventas)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(m.compras)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(m.erogaciones)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      m.resultado >= 0 ? "text-[var(--viz-pos)]" : "text-[var(--viz-neg)]",
                    )}
                  >
                    {formatCurrency(m.resultado)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2">
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(estado.ventas)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(estado.compras)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(estado.erogaciones)}</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-bold tabular-nums",
                    resultadoPos ? "text-[var(--viz-pos)]" : "text-[var(--viz-neg)]",
                  )}
                >
                  {formatCurrency(estado.resultado)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
