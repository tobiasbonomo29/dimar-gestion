"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

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
import { CATEGORIAS_PRODUCTO } from "@/lib/constants";
import type { CategoriaProducto } from "@/types/database";
import type { ProductoConVariantes } from "../queries";
import { createProducto, updateProducto } from "../actions";
import {
  productoDefaults,
  varianteDefaults,
  type ProductoFormValues,
} from "../schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto?: ProductoConVariantes | null;
}

function toFormValues(p: ProductoConVariantes): ProductoFormValues {
  return {
    codigo: p.codigo ?? "",
    nombre: p.nombre,
    categoria: p.categoria,
    descripcion: p.descripcion ?? "",
    unidad_medida: p.unidad_medida,
    precio_base: String(p.precio_base),
    stock: String(p.stock),
    activo: p.activo,
    variantes: p.producto_variantes.map((v) => ({
      id: v.id,
      nombre: v.nombre,
      tamano: v.tamano ?? "",
      presentacion: v.presentacion ?? "",
      cantidad_por_bulto: v.cantidad_por_bulto != null ? String(v.cantidad_por_bulto) : "",
      precio: v.precio != null ? String(v.precio) : "",
    })),
  };
}

export function ProductoFormDialog({ open, onOpenChange, producto }: Props) {
  const router = useRouter();
  const isEdit = Boolean(producto);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = useForm<ProductoFormValues>({ defaultValues: productoDefaults });

  const { fields, append, remove } = useFieldArray({ control, name: "variantes" });

  React.useEffect(() => {
    if (open) reset(producto ? toFormValues(producto) : productoDefaults);
  }, [open, producto, reset]);

  async function onSubmit(values: ProductoFormValues) {
    const result = isEdit
      ? await updateProducto(producto!.id, values)
      : await createProducto(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Producto actualizado" : "Producto creado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            Cargá el producto y sus variantes. Si una variante no tiene precio
            propio, se usa el precio base del producto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" placeholder="Ej: RS2, TB1" {...register("codigo")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" autoFocus {...register("nombre")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Controller
                control={control}
                name="categoria"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="categoria">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIAS_PRODUCTO).map(([value, label]) => (
                        <SelectItem key={value} value={value as CategoriaProducto}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="unidad_medida">Unidad de medida</Label>
              <Input id="unidad_medida" placeholder="unidad, bulto, kg..." {...register("unidad_medida")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="precio_base">Precio base (ARS)</Label>
              <Input id="precio_base" type="number" step="0.01" min="0" {...register("precio_base")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" step="1" {...register("stock")} />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="activo"
                render={({ field }) => (
                  <Switch
                    id="activo"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="activo">Activo</Label>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" rows={2} {...register("descripcion")} />
            </div>
          </div>

          {/* Variantes */}
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-semibold">Variantes</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(varianteDefaults)}
              >
                <Plus className="h-4 w-4" />
                Agregar variante
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                Sin variantes. El producto se cotiza con su precio base.
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-2 items-end gap-2 rounded-md bg-muted/40 p-2 sm:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1fr_auto]"
                  >
                    <div className="grid gap-1">
                      <Label className="text-xs">Nombre *</Label>
                      <Input className="h-8" placeholder="Gel 400g x24" {...register(`variantes.${index}.nombre`)} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Tamaño</Label>
                      <Input className="h-8" placeholder="400g" {...register(`variantes.${index}.tamano`)} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Present.</Label>
                      <Input className="h-8" placeholder="caja" {...register(`variantes.${index}.presentacion`)} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">x bulto</Label>
                      <Input className="h-8" type="number" min="1" {...register(`variantes.${index}.cantidad_por_bulto`)} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Precio</Label>
                      <Input className="h-8" type="number" step="0.01" min="0" placeholder="usa base" {...register(`variantes.${index}.precio`)} />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => remove(index)}
                      aria-label="Quitar variante"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
