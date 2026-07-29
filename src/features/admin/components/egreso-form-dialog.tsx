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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEDIOS_PAGO, TIPOS_EGRESO, CATEGORIAS_EGRESO_SUGERIDAS, ORIGENES_FONDOS } from "@/lib/constants";
import type { TipoEgreso } from "@/types/database";
import { createEgreso } from "../actions";
import { egresoDefaults, type EgresoFormValues } from "../schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: TipoEgreso;
}

export function EgresoFormDialog({ open, onOpenChange, tipo }: Props) {
  const router = useRouter();
  const esCompra = tipo === "compra";

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<EgresoFormValues>({ defaultValues: egresoDefaults(tipo) });

  React.useEffect(() => {
    if (open) reset(egresoDefaults(tipo));
  }, [open, tipo, reset]);

  const medioPago = watch("medio_pago");
  const origen = watch("origen");

  async function onSubmit(values: EgresoFormValues) {
    const result = await createEgreso({ ...values, tipo });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${TIPOS_EGRESO[tipo]} registrada`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nueva {TIPOS_EGRESO[tipo].toLowerCase()}</DialogTitle>
          <DialogDescription>
            {esCompra
              ? "Registrá una compra de mercadería o insumos."
              : "Registrá un gasto o erogación de la unidad."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="concepto">Concepto *</Label>
            <Input
              id="concepto"
              autoFocus
              placeholder={esCompra ? "Ej: Compra de film" : "Ej: Alquiler depósito"}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                list="categorias-egreso"
                placeholder="Elegí o escribí una"
                {...register("categoria")}
              />
              <datalist id="categorias-egreso">
                {CATEGORIAS_EGRESO_SUGERIDAS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proveedor">{esCompra ? "Proveedor" : "Destinatario"}</Label>
              <Input id="proveedor" {...register("proveedor")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="origen">Origen del dinero</Label>
              <Select
                value={origen}
                onValueChange={(v) => setValue("origen", v as EgresoFormValues["origen"])}
              >
                <SelectTrigger id="origen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORIGENES_FONDOS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
