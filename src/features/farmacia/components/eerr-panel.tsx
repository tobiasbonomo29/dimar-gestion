"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Settings2, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { exportToExcel } from "@/lib/export-excel";
import { cn } from "@/lib/utils";
import type { FarmEerr } from "@/types/database";
import { periodoLabel } from "../periodo";
import type { EstadoResultadosFarmacia } from "../queries";
import { guardarEerr } from "../actions";
import type { EerrFormValues } from "../schema";

const MODOS_CMV: { value: EerrFormValues["cmv_modo"]; label: string; ayuda: string }[] = [
  { value: "porcentaje", label: "% sobre ventas", ayuda: "Estimado, como en la planilla." },
  { value: "monto", label: "Monto fijo", ayuda: "Lo cargás vos a mano." },
  { value: "mercaderia", label: "Mercadería cargada", ayuda: "Suma los egresos de rubro mercadería." },
];

function toFormValues(periodo: string, config: FarmEerr | null): EerrFormValues {
  return {
    periodo,
    venta_neta: config?.venta_neta != null ? String(config.venta_neta) : "",
    otros_ingresos: config?.otros_ingresos != null ? String(config.otros_ingresos) : "",
    cmv_modo: config?.cmv_modo ?? "porcentaje",
    cmv_porcentaje: String(config?.cmv_porcentaje ?? 35),
    cmv_monto: String(config?.cmv_monto ?? 0),
    depreciacion: String(config?.depreciacion ?? 0),
    intereses: String(config?.intereses ?? 0),
    ganancias_pct: String(config?.ganancias_pct ?? 0),
    nota: config?.nota ?? "",
  };
}

function pctLabel(v: number) {
  return `${(v * 100).toFixed(2).replace(".", ",")}%`;
}

export function EerrPanel({
  estado,
  config,
}: {
  estado: EstadoResultadosFarmacia;
  config: FarmEerr | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<EerrFormValues>({ defaultValues: toFormValues(estado.periodo, config) });

  React.useEffect(() => {
    if (open) reset(toFormValues(estado.periodo, config));
  }, [open, estado.periodo, config, reset]);

  const cmvModo = watch("cmv_modo");

  async function onSubmit(values: EerrFormValues) {
    const result = await guardarEerr({ ...values, periodo: estado.periodo });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Estado de resultados actualizado");
    setOpen(false);
    router.refresh();
  }

  function descargarExcel() {
    exportToExcel(
      estado.lineas
        // Las líneas de encabezado (INGRESOS, COSTOS…) no llevan importe.
        .filter((l) => !(l.destacada && l.monto === 0 && !l.concepto.startsWith("TOTAL")))
        .map((l) => ({
          Concepto: l.concepto,
          "Monto ($)": l.monto,
          "% s/Ingresos": Number((l.pctVentas * 100).toFixed(2)),
          Notas: l.nota ?? "",
        })),
      `estado-resultados-${estado.periodo}`,
      "EERR",
    );
  }

  const resultadoPos = estado.resultadoNeto >= 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Estado de resultados · {periodoLabel(estado.periodo)}</p>
          <p className="text-sm text-muted-foreground">
            Se arma con lo que cargaste en el mes. Lo que falte, lo definís vos en “Parámetros”.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={descargarExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Settings2 className="h-4 w-4" />
            Parámetros
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total ingresos</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(estado.totalIngresos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Utilidad bruta</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(estado.utilidadBruta)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">EBITDA</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(estado.ebitda)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Resultado neto</p>
            <p
              className={cn(
                "text-xl font-bold tabular-nums",
                resultadoPos ? "text-[var(--viz-pos)]" : "text-[var(--viz-neg)]",
              )}
            >
              {formatCurrency(estado.resultadoNeto)}
            </p>
            <p className="text-xs text-muted-foreground">
              Margen {pctLabel(estado.margenNeto)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalle</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Monto ($)</TableHead>
                <TableHead className="w-[110px] text-right">% s/Ingresos</TableHead>
                <TableHead className="hidden md:table-cell">Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estado.lineas.map((l, i) => {
                // Encabezado de bloque: sin importe ni porcentaje.
                const esEncabezado = l.destacada && l.monto === 0 && !l.concepto.startsWith("TOTAL");
                return (
                  <TableRow key={`${l.concepto}-${i}`} className={cn(l.destacada && "bg-muted/40")}>
                    <TableCell
                      className={cn(
                        l.destacada ? "font-semibold" : "text-muted-foreground",
                        l.detalle && "pl-8",
                      )}
                    >
                      {l.concepto}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        l.destacada && "font-semibold",
                        l.monto < 0 && "text-[var(--viz-neg)]",
                      )}
                    >
                      {esEncabezado ? "" : formatCurrency(l.monto)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {esEncabezado ? "" : pctLabel(l.pctVentas)}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {l.nota ?? ""}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Parámetros de {periodoLabel(estado.periodo)}</DialogTitle>
            <DialogDescription>
              Lo que no sale de los movimientos cargados. Los campos vacíos se calculan solos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="venta_neta">Venta neta del mes</Label>
              <Input
                id="venta_neta"
                type="number"
                step="0.01"
                min="0"
                placeholder={`Vacío = ${formatCurrency(estado.ventasNetas)} (ingresos cargados)`}
                {...register("venta_neta")}
              />
              <p className="text-xs text-muted-foreground">
                Cargala si querés declarar la venta del sistema en vez de la suma de los ingresos.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="otros_ingresos">Otros ingresos</Label>
              <Input
                id="otros_ingresos"
                type="number"
                step="0.01"
                min="0"
                placeholder={`Vacío = ${formatCurrency(estado.otrosIngresos)} (cargados)`}
                {...register("otros_ingresos")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cmv_modo">Cómo calcular el costo de mercadería</Label>
              <Select
                value={cmvModo}
                onValueChange={(v) => setValue("cmv_modo", v as EerrFormValues["cmv_modo"])}
              >
                <SelectTrigger id="cmv_modo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODOS_CMV.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {MODOS_CMV.find((m) => m.value === cmvModo)?.ayuda}
              </p>
            </div>

            {cmvModo === "porcentaje" && (
              <div className="grid gap-2">
                <Label htmlFor="cmv_porcentaje">CMV (% sobre ventas)</Label>
                <Input id="cmv_porcentaje" type="number" step="0.01" min="0" {...register("cmv_porcentaje")} />
              </div>
            )}

            {cmvModo === "monto" && (
              <div className="grid gap-2">
                <Label htmlFor="cmv_monto">CMV del mes</Label>
                <Input id="cmv_monto" type="number" step="0.01" min="0" {...register("cmv_monto")} />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="depreciacion">Depreciación y amortización</Label>
                <Input id="depreciacion" type="number" step="0.01" min="0" {...register("depreciacion")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="intereses">Intereses financieros</Label>
                <Input id="intereses" type="number" step="0.01" min="0" {...register("intereses")} />
                <p className="text-xs text-muted-foreground">
                  Se suman a los egresos de rubro financiero.
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ganancias_pct">Impuesto a las ganancias (%)</Label>
              <Input id="ganancias_pct" type="number" step="0.01" min="0" {...register("ganancias_pct")} />
              <p className="text-xs text-muted-foreground">
                Solo se aplica si el resultado antes de impuestos da positivo.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nota">Nota</Label>
              <Textarea id="nota" rows={2} {...register("nota")} />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
