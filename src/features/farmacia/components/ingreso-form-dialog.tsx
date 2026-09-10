"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { FARM_CONCEPTOS_INGRESO } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FarmIngreso, FarmTipoIngreso } from "@/types/database";
import { createIngreso, updateIngreso } from "../actions";
import { ingresoDefaults, type IngresoFormValues } from "../schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: FarmTipoIngreso;
  /** Fecha por defecto del alta (primer día del período que se está mirando). */
  fechaDefault: string;
  /** Si viene un ingreso, el formulario está en modo edición. */
  ingreso?: FarmIngreso | null;
}

function toFormValues(i: FarmIngreso): IngresoFormValues {
  return {
    tipo: i.tipo,
    fecha: i.fecha,
    semana: i.semana ?? "",
    concepto: i.concepto,
    efectivo: String(i.efectivo),
    banco: String(i.banco),
    obra_social: String(i.obra_social),
    total: String(i.total),
    nota: i.nota ?? "",
  };
}

const n = (v: string) => Number(v) || 0;

export function IngresoFormDialog({ open, onOpenChange, tipo, fechaDefault, ingreso }: Props) {
  const router = useRouter();
  const isEdit = Boolean(ingreso);
  const esVenta = tipo === "venta";

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<IngresoFormValues>({ defaultValues: ingresoDefaults(tipo) });

  React.useEffect(() => {
    if (!open) return;
    reset(ingreso ? toFormValues(ingreso) : { ...ingresoDefaults(tipo), fecha: fechaDefault });
  }, [open, tipo, ingreso, fechaDefault, reset]);

  // El desglose (efectivo/banco/OS) y el total se cargan por separado: en la
  // planilla no siempre coinciden. Si el total queda vacío se toma el desglose.
  const desglose = n(watch("efectivo")) + n(watch("banco")) + n(watch("obra_social"));
  const totalCargado = n(watch("total"));
  const totalEfectivo = totalCargado > 0 ? totalCargado : desglose;
  const diferencia = totalEfectivo - desglose;

  async function onSubmit(values: IngresoFormValues) {
    const payload = { ...values, tipo };
    const result = isEdit ? await updateIngreso(ingreso!.id, payload) : await createIngreso(payload);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Ingreso actualizado" : "Ingreso registrado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar" : "Nuevo"} {esVenta ? "ingreso por venta" : "otro ingreso"}
          </DialogTitle>
          <DialogDescription>
            {esVenta
              ? "Venta del período con el detalle de cómo entró la plata."
              : "Ingreso que no es venta de mostrador: droguería, notas de crédito, convenios."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="concepto">Concepto *</Label>
            <Input
              id="concepto"
              autoFocus
              list="farm-conceptos-ingreso"
              placeholder={esVenta ? "Ej: Facturación" : "Ej: NC PAMI"}
              {...register("concepto")}
            />
            <datalist id="farm-conceptos-ingreso">
              {FARM_CONCEPTOS_INGRESO.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="semana">Semana</Label>
              <Input id="semana" placeholder="Ej: Semana 1" {...register("semana")} />
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Cómo entró la plata
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="efectivo" className="text-xs">Efectivo</Label>
                <Input id="efectivo" type="number" step="0.01" min="0" {...register("efectivo")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="banco" className="text-xs">Banco</Label>
                <Input id="banco" type="number" step="0.01" min="0" {...register("banco")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="obra_social" className="text-xs">
                  {esVenta ? "Obra social" : "Droguería / OS"}
                </Label>
                <Input id="obra_social" type="number" step="0.01" min="0" {...register("obra_social")} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Subtotal cobrado: <span className="font-medium tabular-nums">{formatCurrency(desglose)}</span>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="total">Total del ingreso (venta neta)</Label>
            <Input
              id="total"
              type="number"
              step="0.01"
              min="0"
              placeholder={`Vacío = ${formatCurrency(desglose)}`}
              {...register("total")}
            />
            <p
              className={cn(
                "text-xs",
                diferencia !== 0 ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground",
              )}
            >
              {diferencia === 0
                ? "El total coincide con lo cobrado."
                : diferencia > 0
                  ? `Quedan ${formatCurrency(diferencia)} facturados sin cobrar en esta línea.`
                  : `Se cobró ${formatCurrency(-diferencia)} más de lo facturado en esta línea.`}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nota">Nota</Label>
            <Textarea id="nota" rows={2} {...register("nota")} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
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
  );
}
