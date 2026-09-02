"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Insumo } from "@/types/database";
import { crearInsumo, actualizarInsumo } from "../actions";
import { insumoDefaults, type InsumoFormValues } from "../schema";

function toForm(i: Insumo): InsumoFormValues {
  return {
    nombre: i.nombre,
    presentacion: i.presentacion ?? "",
    unidad_medida: i.unidad_medida,
    categoria: i.categoria ?? "",
    stock: String(i.stock),
    stock_minimo: String(i.stock_minimo),
  };
}

export function InsumoFormDialog({
  open,
  onOpenChange,
  insumo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insumo?: Insumo | null;
}) {
  const router = useRouter();
  const isEdit = Boolean(insumo);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<InsumoFormValues>({
    defaultValues: insumoDefaults,
  });

  React.useEffect(() => {
    if (open) reset(insumo ? toForm(insumo) : insumoDefaults);
  }, [open, insumo, reset]);

  async function onSubmit(values: InsumoFormValues) {
    const result = isEdit ? await actualizarInsumo(insumo!.id, values) : await crearInsumo(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Insumo actualizado" : "Insumo creado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
          <DialogDescription>
            Materia prima / insumo stockeado por presentación. El stock se repone desde Compras.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input id="nombre" autoFocus placeholder="Ej: Film stretch" {...register("nombre")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="presentacion">Presentación</Label>
              <Input id="presentacion" placeholder="Ej: Rollo 500m" {...register("presentacion")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unidad_medida">Unidad de medida</Label>
              <Input id="unidad_medida" placeholder="unidad, kg, rollo..." {...register("unidad_medida")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input id="categoria" {...register("categoria")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock">Stock actual</Label>
              <Input id="stock" type="number" step="0.01" min="0" {...register("stock")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock_minimo">Stock mínimo</Label>
              <Input id="stock_minimo" type="number" step="0.01" min="0" {...register("stock_minimo")} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar" : "Crear insumo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
