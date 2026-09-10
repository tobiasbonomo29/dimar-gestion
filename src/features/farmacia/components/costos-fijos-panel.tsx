"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, CalendarPlus } from "lucide-react";

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
import { formatCurrency } from "@/lib/format";
import { periodoLabel } from "../periodo";
import type { FarmCostoFijo } from "@/types/database";
import { createCostoFijo, deleteCostoFijo, generarCostosFijos, updateCostoFijo } from "../actions";
import { costoFijoDefaults, type CostoFijoFormValues } from "../schema";

function toFormValues(c: FarmCostoFijo): CostoFijoFormValues {
  return {
    concepto: c.concepto,
    proveedor: c.proveedor ?? "",
    dia_vencimiento: c.dia_vencimiento ? String(c.dia_vencimiento) : "",
    monto: String(c.monto),
    activo: c.activo,
    nota: c.nota ?? "",
  };
}

export function CostosFijosPanel({
  costos,
  periodo,
  yaGenerados,
}: {
  costos: FarmCostoFijo[];
  periodo: string;
  /** Cuántos egresos de rubro "fijo" ya hay cargados este mes. */
  yaGenerados: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [enEdicion, setEnEdicion] = React.useState<FarmCostoFijo | null>(null);
  const [aBorrar, setABorrar] = React.useState<FarmCostoFijo | null>(null);
  const [generando, setGenerando] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<CostoFijoFormValues>({ defaultValues: costoFijoDefaults() });

  React.useEffect(() => {
    if (open) reset(enEdicion ? toFormValues(enEdicion) : costoFijoDefaults());
  }, [open, enEdicion, reset]);

  const activo = watch("activo");

  const totalMensual = React.useMemo(
    () => costos.filter((c) => c.activo).reduce((acc, c) => acc + Number(c.monto), 0),
    [costos],
  );

  async function onSubmit(values: CostoFijoFormValues) {
    const result = enEdicion
      ? await updateCostoFijo(enEdicion.id, values)
      : await createCostoFijo(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(enEdicion ? "Costo fijo actualizado" : "Costo fijo agregado");
    setOpen(false);
    setEnEdicion(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!aBorrar) return;
    const result = await deleteCostoFijo(aBorrar.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Costo fijo eliminado");
    setABorrar(null);
    router.refresh();
  }

  async function generar() {
    setGenerando(true);
    const result = await generarCostosFijos(periodo);
    setGenerando(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const { creados, omitidos } = result.data;
    if (creados === 0) {
      toast.info("Los costos fijos de este mes ya estaban cargados");
    } else {
      toast.success(
        `Se cargaron ${creados} gastos fijos en ${periodoLabel(periodo)}` +
          (omitidos > 0 ? ` (${omitidos} ya estaban)` : ""),
      );
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Plantilla de gastos recurrentes. Por sí sola no suma: con “Cargar en {periodoLabel(periodo)}”
          se crean los egresos del mes, y esos son los que entran al estado de resultados.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generar} disabled={generando || costos.length === 0}>
            {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Cargar en {periodoLabel(periodo)}
          </Button>
          <Button
            onClick={() => {
              setEnEdicion(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo costo fijo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total mensual estimado</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalMensual)}</p>
            <p className="text-xs text-muted-foreground">
              {costos.filter((c) => c.activo).length} conceptos activos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Ya cargados en {periodoLabel(periodo)}
            </p>
            <p className="text-2xl font-bold tabular-nums">{yaGenerados}</p>
            <p className="text-xs text-muted-foreground">egresos de rubro “gasto fijo”</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="w-[110px]">Vence</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {costos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Todavía no cargaste costos fijos (alquiler, luz, contador…).
                </TableCell>
              </TableRow>
            ) : (
              costos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.concepto}</span>
                      {!c.activo && (
                        <Badge className="text-muted-foreground">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.proveedor ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.dia_vencimiento ? `Día ${c.dia_vencimiento}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(c.monto)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEnEdicion(c);
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
                        onClick={() => setABorrar(c)}
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{enEdicion ? "Editar costo fijo" : "Nuevo costo fijo"}</DialogTitle>
            <DialogDescription>
              Gasto que se repite todos los meses con el mismo importe aproximado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="concepto">Concepto *</Label>
              <Input id="concepto" autoFocus placeholder="Ej: Alquiler local" {...register("concepto")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="monto">Monto mensual</Label>
                <Input id="monto" type="number" step="0.01" min="0" {...register("monto")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dia_vencimiento">Día de vencimiento</Label>
                <Input
                  id="dia_vencimiento"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ej: 10"
                  {...register("dia_vencimiento")}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input id="proveedor" placeholder="Ej: Inmobiliaria Centro" {...register("proveedor")} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="activo">Activo</Label>
                <p className="text-xs text-muted-foreground">
                  Solo los activos se cargan al generar el mes.
                </p>
              </div>
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
        title="Eliminar costo fijo"
        description={
          aBorrar
            ? `Se eliminará "${aBorrar.concepto}" de la plantilla. Los egresos ya cargados no se tocan.`
            : undefined
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
