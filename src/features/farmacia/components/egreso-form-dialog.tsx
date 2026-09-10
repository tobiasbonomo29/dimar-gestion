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
import { MEDIOS_PAGO, FARM_RUBROS_EGRESO, FARM_CATEGORIAS_EGRESO } from "@/lib/constants";
import type { FarmEgreso, FarmProveedor, FarmRubroEgreso } from "@/types/database";
import { createEgreso, updateEgreso } from "../actions";
import { egresoDefaults, type EgresoFormValues } from "../schema";

/** Valor del select cuando el proveedor se escribe a mano en vez de elegirlo. */
const OTRO = "__otro__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedores: FarmProveedor[];
  fechaDefault: string;
  rubroDefault?: FarmRubroEgreso;
  egreso?: FarmEgreso | null;
}

function toFormValues(e: FarmEgreso): EgresoFormValues {
  return {
    rubro: e.rubro,
    fecha: e.fecha,
    semana: e.semana ?? "",
    concepto: e.concepto,
    categoria: e.categoria ?? "",
    proveedor_id: e.proveedor_id ?? "",
    proveedor: e.proveedor ?? "",
    medio_pago: e.medio_pago,
    monto: String(e.monto),
    vencimiento: e.vencimiento ?? "",
    pagado: e.pagado,
    nota: e.nota ?? "",
  };
}

export function EgresoFormDialog({
  open,
  onOpenChange,
  proveedores,
  fechaDefault,
  rubroDefault = "variable",
  egreso,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(egreso);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<EgresoFormValues>({ defaultValues: egresoDefaults(rubroDefault) });

  React.useEffect(() => {
    if (!open) return;
    reset(egreso ? toFormValues(egreso) : { ...egresoDefaults(rubroDefault), fecha: fechaDefault });
  }, [open, egreso, rubroDefault, fechaDefault, reset]);

  const rubro = watch("rubro");
  const medioPago = watch("medio_pago");
  const proveedorId = watch("proveedor_id");
  const pagado = watch("pagado");

  // Si eligió un proveedor de la lista se muestra ese; si no, un campo libre.
  const seleccion = proveedorId || (watch("proveedor") ? OTRO : "");

  function elegirProveedor(v: string) {
    if (v === OTRO) {
      setValue("proveedor_id", "");
      return;
    }
    setValue("proveedor_id", v);
    // El nombre libre queda vacío: manda el proveedor de la lista.
    setValue("proveedor", "");
  }

  async function onSubmit(values: EgresoFormValues) {
    const result = isEdit ? await updateEgreso(egreso!.id, values) : await createEgreso(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Egreso actualizado" : "Egreso registrado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar egreso" : "Nuevo egreso"}</DialogTitle>
          <DialogDescription>
            Salida de dinero de la farmacia. El rubro define en qué línea del estado de
            resultados impacta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="rubro">Rubro *</Label>
            <Select value={rubro} onValueChange={(v) => setValue("rubro", v as FarmRubroEgreso)}>
              <SelectTrigger id="rubro">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FARM_RUBROS_EGRESO).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Va a: {FARM_RUBROS_EGRESO[rubro].linea}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="concepto">Concepto *</Label>
            <Input
              id="concepto"
              autoFocus
              placeholder="Ej: Pago mercadería Asoprofarma"
              {...register("concepto")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="monto">Monto *</Label>
              <Input id="monto" type="number" step="0.01" min="0" {...register("monto")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="proveedor-select">Proveedor</Label>
            <Select value={seleccion} onValueChange={elegirProveedor}>
              <SelectTrigger id="proveedor-select">
                <SelectValue placeholder="Elegí de la lista o cargá uno a mano" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
                <SelectItem value={OTRO}>Otro (escribirlo)</SelectItem>
              </SelectContent>
            </Select>
            {!proveedorId && (
              <Input
                placeholder="Nombre del proveedor"
                aria-label="Nombre del proveedor"
                {...register("proveedor")}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                list="farm-categorias-egreso"
                placeholder="Elegí o escribí una"
                {...register("categoria")}
              />
              <datalist id="farm-categorias-egreso">
                {FARM_CATEGORIAS_EGRESO.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="medio_pago">Medio de pago</Label>
              <Select
                value={medioPago}
                onValueChange={(v) => setValue("medio_pago", v as EgresoFormValues["medio_pago"])}
              >
                <SelectTrigger id="medio_pago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEDIOS_PAGO).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="semana">Semana</Label>
              <Input id="semana" placeholder="Ej: Semana 1" {...register("semana")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vencimiento">Vencimiento</Label>
              <Input id="vencimiento" type="date" {...register("vencimiento")} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="pagado">Ya pagado</Label>
              <p className="text-xs text-muted-foreground">
                Si está pendiente, igual suma al resultado del mes.
              </p>
            </div>
            <Switch id="pagado" checked={pagado} onCheckedChange={(v) => setValue("pagado", v)} />
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
