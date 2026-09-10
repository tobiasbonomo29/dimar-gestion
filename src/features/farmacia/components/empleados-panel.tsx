"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { FarmEmpleado } from "@/types/database";
import { createEmpleado, deleteEmpleado, updateEmpleado } from "../actions";
import { empleadoDefaults, type EmpleadoFormValues } from "../schema";

function toFormValues(e: FarmEmpleado): EmpleadoFormValues {
  return {
    nombre: e.nombre,
    puesto: e.puesto ?? "",
    fecha_ingreso: e.fecha_ingreso ?? "",
    sueldo_bruto: String(e.sueldo_bruto),
    cargas_pct: String(e.cargas_pct),
    activo: e.activo,
    nota: e.nota ?? "",
  };
}

/** Costo total para la farmacia = bruto + cargas sociales. */
function costoTotal(e: FarmEmpleado) {
  return Number(e.sueldo_bruto) * (1 + Number(e.cargas_pct) / 100);
}

export function EmpleadosPanel({ empleados }: { empleados: FarmEmpleado[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [enEdicion, setEnEdicion] = React.useState<FarmEmpleado | null>(null);
  const [aBorrar, setABorrar] = React.useState<FarmEmpleado | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<EmpleadoFormValues>({ defaultValues: empleadoDefaults() });

  React.useEffect(() => {
    if (open) reset(enEdicion ? toFormValues(enEdicion) : empleadoDefaults());
  }, [open, enEdicion, reset]);

  const activo = watch("activo");
  const bruto = Number(watch("sueldo_bruto")) || 0;
  const pct = Number(watch("cargas_pct")) || 0;
  const cargas = (bruto * pct) / 100;

  const activos = empleados.filter((e) => e.activo);
  const costoMensual = activos.reduce((acc, e) => acc + costoTotal(e), 0);

  async function onSubmit(values: EmpleadoFormValues) {
    const result = enEdicion
      ? await updateEmpleado(enEdicion.id, values)
      : await createEmpleado(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(enEdicion ? "Empleado actualizado" : "Empleado agregado");
    setOpen(false);
    setEnEdicion(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!aBorrar) return;
    const result = await deleteEmpleado(aBorrar.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Empleado eliminado");
    setABorrar(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Legajo con el sueldo de referencia de cada uno. Desde acá se liquida el mes en la
          pestaña “Sueldos”.
        </p>
        <Button
          onClick={() => {
            setEnEdicion(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo empleado
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Costo mensual de referencia</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(costoMensual)}</p>
            <p className="text-xs text-muted-foreground">Bruto + cargas de los activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Empleados activos</p>
            <p className="text-2xl font-bold tabular-nums">{activos.length}</p>
            <p className="text-xs text-muted-foreground">
              {empleados.length - activos.length} inactivos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead className="w-[110px]">Ingreso</TableHead>
              <TableHead className="text-right">Sueldo bruto</TableHead>
              <TableHead className="text-right">Cargas</TableHead>
              <TableHead className="text-right">Costo total</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {empleados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Todavía no cargaste empleados.
                </TableCell>
              </TableRow>
            ) : (
              empleados.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{e.nombre}</span>
                      {!e.activo && (
                        <Badge className="text-muted-foreground">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.puesto ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.fecha_ingreso ? formatDate(e.fecha_ingreso) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(e.sueldo_bruto)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(e.cargas_pct)}%
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(costoTotal(e))}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEnEdicion(e);
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
                        onClick={() => setABorrar(e)}
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
            <DialogTitle>{enEdicion ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
            <DialogDescription>
              El sueldo bruto y el % de cargas se usan como base al liquidar el mes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input id="nombre" autoFocus {...register("nombre")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="puesto">Puesto</Label>
                <Input id="puesto" placeholder="Ej: Farmacéutico" {...register("puesto")} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fecha_ingreso">Fecha de ingreso</Label>
              <Input id="fecha_ingreso" type="date" {...register("fecha_ingreso")} />
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
              <div className="mt-1 flex justify-between font-medium">
                <span>Costo total para la farmacia</span>
                <span className="tabular-nums">{formatCurrency(bruto + cargas)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="activo">Activo</Label>
              <Switch id="activo" checked={activo} onCheckedChange={(v) => setValue("activo", v)} />
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
        title="Eliminar empleado"
        description={
          aBorrar
            ? `Se eliminará a ${aBorrar.nombre} del legajo. Las liquidaciones ya cargadas se mantienen.`
            : undefined
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
