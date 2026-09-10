"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Users, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatNumber } from "@/lib/format";
import { exportToExcel } from "@/lib/export-excel";
import { periodoLabel } from "../periodo";
import type { FarmEmpleado, FarmSueldo } from "@/types/database";
import { createSueldo, deleteSueldo, generarSueldos, updateSueldo } from "../actions";
import { sueldoDefaults, type SueldoFormValues } from "../schema";

/** Valor del select cuando la liquidación no corresponde a un empleado del legajo. */
const SUELTO = "__suelto__";

function toFormValues(s: FarmSueldo): SueldoFormValues {
  return {
    periodo: s.periodo,
    empleado_id: s.empleado_id ?? "",
    empleado: s.empleado,
    puesto: s.puesto ?? "",
    sueldo_bruto: String(s.sueldo_bruto),
    cargas_pct: String(s.cargas_pct),
    pagado: s.pagado,
    nota: s.nota ?? "",
  };
}

export function SueldosPanel({
  sueldos,
  empleados,
  periodo,
}: {
  sueldos: FarmSueldo[];
  empleados: FarmEmpleado[];
  periodo: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [enEdicion, setEnEdicion] = React.useState<FarmSueldo | null>(null);
  const [aBorrar, setABorrar] = React.useState<FarmSueldo | null>(null);
  const [generando, setGenerando] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<SueldoFormValues>({ defaultValues: sueldoDefaults(periodo) });

  React.useEffect(() => {
    if (open) reset(enEdicion ? toFormValues(enEdicion) : sueldoDefaults(periodo));
  }, [open, enEdicion, periodo, reset]);

  const empleadoId = watch("empleado_id");
  const pagado = watch("pagado");
  const bruto = Number(watch("sueldo_bruto")) || 0;
  const pct = Number(watch("cargas_pct")) || 0;
  const cargas = (bruto * pct) / 100;

  const totales = React.useMemo(() => {
    const t = { bruto: 0, cargas: 0, neto: 0, costo: 0, pendiente: 0 };
    for (const s of sueldos) {
      t.bruto += Number(s.sueldo_bruto);
      t.cargas += Number(s.cargas_monto);
      t.neto += Number(s.sueldo_neto);
      t.costo += Number(s.costo_total);
      if (!s.pagado) t.pendiente += Number(s.sueldo_neto);
    }
    return t;
  }, [sueldos]);

  /** Al elegir un empleado del legajo se precargan sus valores de referencia. */
  function elegirEmpleado(v: string) {
    if (v === SUELTO) {
      setValue("empleado_id", "");
      return;
    }
    const e = empleados.find((x) => x.id === v);
    if (!e) return;
    setValue("empleado_id", e.id);
    setValue("empleado", e.nombre);
    setValue("puesto", e.puesto ?? "");
    setValue("sueldo_bruto", String(e.sueldo_bruto));
    setValue("cargas_pct", String(e.cargas_pct));
  }

  async function onSubmit(values: SueldoFormValues) {
    const payload = { ...values, periodo };
    const result = enEdicion ? await updateSueldo(enEdicion.id, payload) : await createSueldo(payload);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(enEdicion ? "Liquidación actualizada" : "Liquidación cargada");
    setOpen(false);
    setEnEdicion(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!aBorrar) return;
    const result = await deleteSueldo(aBorrar.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Liquidación eliminada");
    setABorrar(null);
    router.refresh();
  }

  async function generar() {
    setGenerando(true);
    const result = await generarSueldos(periodo);
    setGenerando(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const { creados, omitidos } = result.data;
    if (creados === 0) {
      toast.info(
        empleados.length === 0
          ? "Primero cargá empleados en la pestaña “Empleados”"
          : "Todos los empleados ya están liquidados en este mes",
      );
    } else {
      toast.success(
        `Se liquidaron ${creados} empleados` + (omitidos > 0 ? ` (${omitidos} ya estaban)` : ""),
      );
    }
    router.refresh();
  }

  function descargarExcel() {
    exportToExcel(
      sueldos.map((s) => ({
        Empleado: s.empleado,
        Puesto: s.puesto ?? "",
        "Sueldo bruto": Number(s.sueldo_bruto),
        "Cargas (%)": Number(s.cargas_pct),
        "Cargas ($)": Number(s.cargas_monto),
        "Sueldo neto": Number(s.sueldo_neto),
        "Costo total": Number(s.costo_total),
        Estado: s.pagado ? "Pagado" : "Pendiente",
        Nota: s.nota ?? "",
      })),
      `sueldos-${periodo}`,
      "Sueldos",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Liquidación de {periodoLabel(periodo)}. El costo total (bruto + cargas) es lo que va a
          “Gastos de personal” en el estado de resultados.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={descargarExcel} disabled={sueldos.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={generar} disabled={generando}>
            {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Liquidar empleados
          </Button>
          <Button
            onClick={() => {
              setEnEdicion(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva liquidación
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Sueldos brutos</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(totales.bruto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Cargas sociales</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(totales.cargas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Neto a pagar pendiente</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(totales.pendiente)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Costo total del mes</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(totales.costo)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead className="text-right">Bruto</TableHead>
              <TableHead className="text-right">Cargas</TableHead>
              <TableHead className="text-right">Neto</TableHead>
              <TableHead className="text-right">Costo total</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sueldos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Sin liquidaciones en {periodoLabel(periodo)}. Usá “Liquidar empleados” para cargarlas
                  de una.
                </TableCell>
              </TableRow>
            ) : (
              sueldos.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.empleado}</TableCell>
                  <TableCell className="text-muted-foreground">{s.puesto ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(s.sueldo_bruto)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(s.cargas_monto)}
                    <span className="ml-1 text-xs">({formatNumber(s.cargas_pct)}%)</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(s.sueldo_neto)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(s.costo_total)}
                  </TableCell>
                  <TableCell>
                    {s.pagado ? (
                      <Badge className="border-green-200 bg-green-100 text-green-700">
                        Pagado
                      </Badge>
                    ) : (
                      <Badge className="border-amber-200 bg-amber-100 text-amber-800">
                        Pendiente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEnEdicion(s);
                          setOpen(true);
                        }}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setABorrar(s)}
                        aria-label="Eliminar"
                      >
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

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEnEdicion(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{enEdicion ? "Editar liquidación" : "Nueva liquidación"}</DialogTitle>
            <DialogDescription>Sueldo de {periodoLabel(periodo)}.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="empleado-select">Empleado</Label>
              <Select value={empleadoId || SUELTO} onValueChange={elegirEmpleado}>
                <SelectTrigger id="empleado-select">
                  <SelectValue placeholder="Elegí del legajo" />
                </SelectTrigger>
                <SelectContent>
                  {empleados.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                  <SelectItem value={SUELTO}>Otro (escribirlo)</SelectItem>
                </SelectContent>
              </Select>
              {!empleadoId && (
                <Input
                  placeholder="Nombre del empleado"
                  aria-label="Nombre del empleado"
                  {...register("empleado")}
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="puesto">Puesto</Label>
              <Input id="puesto" {...register("puesto")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sueldo_bruto">Sueldo bruto</Label>
                <Input id="sueldo_bruto" type="number" step="0.01" min="0" {...register("sueldo_bruto")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cargas_pct">Cargas sociales (%)</Label>
                <Input id="cargas_pct" type="number" step="0.01" min="0" max="100" {...register("cargas_pct")} />
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Cargas sociales</span>
                <span className="tabular-nums">{formatCurrency(cargas)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Sueldo neto</span>
                <span className="tabular-nums">{formatCurrency(Math.max(bruto - cargas, 0))}</span>
              </div>
              <div className="mt-1 flex justify-between font-medium">
                <span>Costo total</span>
                <span className="tabular-nums">{formatCurrency(bruto + cargas)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="pagado">Ya pagado</Label>
              <Switch id="pagado" checked={pagado} onCheckedChange={(v) => setValue("pagado", v)} />
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

      <ConfirmDialog
        open={aBorrar !== null}
        onOpenChange={(o) => !o && setABorrar(null)}
        title="Eliminar liquidación"
        description={
          aBorrar
            ? `Se eliminará la liquidación de ${aBorrar.empleado} (${formatCurrency(aBorrar.costo_total)}).`
            : undefined
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
