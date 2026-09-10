"use client";

import { TrendingUp, TrendingDown, Wallet, Users, Banknote, Landmark, HeartPulse } from "lucide-react";

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
import { BarrasMensual, BarrasResultado, DonutCategorias } from "@/features/admin/components/charts";
import type { MesResultado } from "@/features/admin/queries";
import type { EstadoResultadosFarmacia, MesFarmacia } from "../queries";

function Kpi({
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

/**
 * Los gráficos del módulo Administración esperan la forma `MesResultado`
 * (ventas / compras / erogaciones). Acá la farmacia solo distingue ingresos y
 * egresos, así que todo el egreso se mapea a "compras".
 */
function aMesResultado(m: MesFarmacia): MesResultado {
  return {
    mes: m.periodo,
    label: m.label.replace(/ \d{4}$/, ""), // "Abril 2026" -> "Abril"
    ventas: m.ingresos,
    compras: m.egresos,
    erogaciones: 0,
    resultado: m.resultado,
  };
}

export function TableroPanel({
  estado,
  evolucion,
}: {
  estado: EstadoResultadosFarmacia;
  evolucion: MesFarmacia[];
}) {
  const resultadoPos = estado.resultadoNeto >= 0;
  const meses = evolucion.map(aMesResultado);

  const gastos = [
    { categoria: "Personal", monto: estado.personal },
    { categoria: "Costos fijos", monto: estado.costosFijos },
    { categoria: "Gastos variables", monto: estado.gastosVariables },
    { categoria: "CMV", monto: estado.cmv },
    { categoria: "Impuestos", monto: estado.impuestos },
  ].filter((g) => g.monto > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Ingresos totales"
          value={formatCurrency(estado.totalIngresos)}
          icon={TrendingUp}
          hint={`Ventas ${formatCurrency(estado.ventasNetas)}`}
        />
        <Kpi
          label="EBITDA"
          value={formatCurrency(estado.ebitda)}
          icon={estado.ebitda >= 0 ? TrendingUp : TrendingDown}
          tone={estado.ebitda >= 0 ? "pos" : "neg"}
        />
        <Kpi
          label="Resultado neto"
          value={formatCurrency(estado.resultadoNeto)}
          icon={Wallet}
          tone={resultadoPos ? "pos" : "neg"}
          hint={`Margen ${(estado.margenNeto * 100).toFixed(1).replace(".", ",")}%`}
        />
        <Kpi
          label="Gastos de personal"
          value={formatCurrency(estado.personal)}
          icon={Users}
          hint={
            estado.cantEmpleados > 0
              ? `${estado.cantEmpleados} empleados · ${formatCurrency(estado.costoPorEmpleado)} c/u`
              : "Sin liquidaciones cargadas"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Kpi label="Cobrado en efectivo" value={formatCurrency(estado.cobrado.efectivo)} icon={Banknote} />
        <Kpi label="Cobrado por banco" value={formatCurrency(estado.cobrado.banco)} icon={Landmark} />
        <Kpi
          label="Obra social / droguería"
          value={formatCurrency(estado.cobrado.obraSocial)}
          icon={HeartPulse}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ingresos y egresos por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <BarrasMensual data={meses} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribución de gastos</CardTitle>
          </CardHeader>
          <CardContent>
            {gastos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin gastos cargados en el mes.
              </p>
            ) : (
              <DonutCategorias data={gastos} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resultado por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <BarrasResultado data={meses} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumen del mes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { label: "Ventas netas", monto: estado.ventasNetas },
                  { label: "Otros ingresos", monto: estado.otrosIngresos },
                  { label: "Costo de mercadería", monto: -estado.cmv },
                  { label: "Utilidad bruta", monto: estado.utilidadBruta },
                  { label: "Gastos operativos", monto: -estado.totalOperativos },
                  { label: "Impuestos", monto: -estado.impuestos },
                  { label: "Resultado neto", monto: estado.resultadoNeto },
                ].map((r) => (
                  <TableRow key={r.label}>
                    <TableCell className="text-muted-foreground">{r.label}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        r.monto < 0 && "text-[var(--viz-neg)]",
                      )}
                    >
                      {formatCurrency(r.monto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
