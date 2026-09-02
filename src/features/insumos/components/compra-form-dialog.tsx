"use client";

import * as React from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
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
import { MEDIOS_PAGO } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { Insumo } from "@/types/database";
import { crearCompra } from "../actions";
import { compraDefaults, compraItemDefaults, type CompraFormValues } from "../schema";

export function CompraFormDialog({
  open,
  onOpenChange,
  insumos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insumos: Insumo[];
}) {
  const router = useRouter();
  const [itemKeys, setItemKeys] = React.useState<Record<number, string>>({});

  const opciones = React.useMemo<ComboboxOption[]>(
    () =>
      insumos.map((i) => ({
        value: i.id,
        label: i.presentacion ? `${i.nombre} · ${i.presentacion}` : i.nombre,
        description: `Stock: ${i.stock} ${i.unidad_medida}`,
      })),
    [insumos],
  );
  const insumoMap = React.useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  const { register, handleSubmit, control, setValue, reset, watch, formState: { isSubmitting } } =
    useForm<CompraFormValues>({ defaultValues: { ...compraDefaults, items: [compraItemDefaults] } });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });
  const medio = watch("medio_pago");

  React.useEffect(() => {
    if (open) {
      reset({ ...compraDefaults, items: [compraItemDefaults] });
      setItemKeys({});
    }
  }, [open, reset]);

  const total = (watchedItems ?? []).reduce(
    (acc, it) => acc + (Number(it?.cantidad) || 0) * (Number(it?.precio_unitario) || 0),
    0,
  );

  function onSelectInsumo(index: number, id: string) {
    const ins = insumoMap.get(id);
    if (!ins) return;
    setItemKeys((prev) => ({ ...prev, [index]: id }));
    setValue(`items.${index}.insumo_id`, id);
    setValue(`items.${index}.descripcion`, ins.presentacion ? `${ins.nombre} - ${ins.presentacion}` : ins.nombre);
  }

  async function onSubmit(values: CompraFormValues) {
    const result = await crearCompra(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Compra registrada — stock actualizado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva compra de insumos</DialogTitle>
          <DialogDescription>
            Al guardar se suma el stock de cada insumo y se registra el gasto en el estado de
            resultados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2 sm:col-span-1">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
            </div>
            <div className="grid gap-2 sm:col-span-1">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input id="proveedor" {...register("proveedor")} />
            </div>
            <div className="grid gap-2 sm:col-span-1">
              <Label htmlFor="medio_pago">Medio de pago</Label>
              <Select value={medio} onValueChange={(v) => setValue("medio_pago", v as CompraFormValues["medio_pago"])}>
                <SelectTrigger id="medio_pago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEDIOS_PAGO).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Ítems</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append(compraItemDefaults)}>
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border p-3">
                <div className="grid gap-2">
                  <Combobox
                    options={opciones}
                    value={itemKeys[index] ?? null}
                    onSelect={(id) => onSelectInsumo(index, id)}
                    placeholder="Elegir insumo del inventario (o escribir descripción)"
                    searchPlaceholder="Buscar insumo..."
                    emptyText="Sin coincidencias. Podés escribir la descripción a mano."
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_100px_130px_120px_auto] sm:items-end">
                    <div className="col-span-2 grid gap-1 sm:col-span-1">
                      <Label className="text-xs">Descripción *</Label>
                      <Input className="h-8" {...register(`items.${index}.descripcion`)} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Cantidad</Label>
                      <Input className="h-8" type="number" step="0.01" min="0" {...register(`items.${index}.cantidad`)} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Precio unit.</Label>
                      <Input className="h-8" type="number" step="0.01" min="0" {...register(`items.${index}.precio_unitario`)} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Subtotal</Label>
                      <div className="flex h-8 items-center text-sm tabular-nums">
                        {formatCurrency((Number(watchedItems?.[index]?.cantidad) || 0) * (Number(watchedItems?.[index]?.precio_unitario) || 0))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => remove(index)}
                      aria-label="Quitar ítem"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nota">Nota</Label>
            <Textarea id="nota" rows={2} {...register("nota")} />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Total de la compra</span>
            <span className="text-lg font-bold tabular-nums">{formatCurrency(total)}</span>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar compra
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
