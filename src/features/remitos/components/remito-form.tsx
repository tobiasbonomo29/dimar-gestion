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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { ProductoConVariantes } from "@/features/productos/queries";
import { getProductoNombre } from "@/features/productos/display";
import { createRemito } from "../actions";
import { descargarRemitoPDF } from "./descargar-remito";
import {
  remitoDefaults,
  remitoItemDefaults,
  type RemitoFormValues,
} from "../schema";

interface Props {
  catalogo: ProductoConVariantes[];
}

// Entrada de catálogo: producto ("p:id") o variante ("v:id").
type CatalogoEntry = {
  producto_id: string;
  descripcion: string;
  unidad: string;
};

function buildCatalogo(catalogo: ProductoConVariantes[]): {
  options: ComboboxOption[];
  map: Map<string, CatalogoEntry>;
} {
  const options: ComboboxOption[] = [];
  const map = new Map<string, CatalogoEntry>();

  for (const p of catalogo) {
    const keyP = `p:${p.id}`;
    const productoNombre = getProductoNombre(p);
    const nombreP = p.codigo ? `${p.codigo} · ${productoNombre}` : productoNombre;
    options.push({ value: keyP, label: nombreP, description: `Stock: ${p.stock}` });
    map.set(keyP, { producto_id: p.id, descripcion: productoNombre, unidad: p.unidad_medida });

    for (const v of p.producto_variantes) {
      const keyV = `v:${v.id}`;
      const label = `${nombreP} · ${v.nombre}`;
      options.push({ value: keyV, label });
      map.set(keyV, {
        producto_id: p.id,
        descripcion: `${productoNombre} - ${v.nombre}`,
        unidad: v.presentacion ?? p.unidad_medida,
      });
    }
  }
  return { options, map };
}

export function RemitoForm({ catalogo }: Props) {
  const router = useRouter();
  // Guarda qué opción de catálogo se eligió en cada fila (para el combobox).
  const [itemKeys, setItemKeys] = React.useState<Record<number, string>>({});

  const { options: catalogoOptions, map: catalogoMap } = React.useMemo(
    () => buildCatalogo(catalogo),
    [catalogo],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<RemitoFormValues>({
    defaultValues: { ...remitoDefaults, items: [remitoItemDefaults] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });

  // Total en vivo: solo suma los renglones que tienen precio cargado.
  const { hayPrecios, total } = React.useMemo(() => {
    let hayPrecios = false;
    const total = (watchedItems ?? []).reduce((acc, it) => {
      const precioStr = it?.precio_unitario?.trim();
      if (!precioStr) return acc;
      hayPrecios = true;
      const precio = Number(precioStr) || 0;
      const cant = Number(it?.cantidad) || 0;
      return acc + cant * precio;
    }, 0);
    return { hayPrecios, total };
  }, [watchedItems]);

  function onSelectCatalogo(index: number, key: string) {
    const entry = catalogoMap.get(key);
    if (!entry) return;
    setItemKeys((prev) => ({ ...prev, [index]: key }));
    setValue(`items.${index}.producto_id`, entry.producto_id);
    setValue(`items.${index}.descripcion`, entry.descripcion);
    setValue(`items.${index}.unidad`, entry.unidad);
  }

  async function onSubmit(values: RemitoFormValues) {
    const result = await createRemito(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Remito N° ${String(result.data.remito.numero).padStart(4, "0")} creado`);
    // Descarga el PDF con los ítems recién cargados.
    try {
      await descargarRemitoPDF(
        result.data.remito,
        values.items.map((it) => ({
          descripcion: it.descripcion,
          cantidad: Number(it.cantidad) || 0,
          unidad: it.unidad?.trim() ? it.unidad.trim() : null,
          precio_unitario: it.precio_unitario?.trim() ? Number(it.precio_unitario) : null,
        })),
      );
    } catch (err) {
      console.error(err);
      toast.error("El remito se creó, pero no se pudo generar el PDF.");
    }
    router.push("/remitos");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
      {/* Columna principal */}
      <div className="space-y-6 lg:col-span-2">
        {/* Destinatario + datos generales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Destinatario</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="destinatario">Destinatario *</Label>
              <Input
                id="destinatario"
                placeholder="Nombre o razón social de quien recibe"
                {...register("destinatario")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="destinatario_cuit">CUIT / DNI</Label>
              <Input id="destinatario_cuit" {...register("destinatario_cuit")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="destinatario_direccion">Dirección de entrega</Label>
              <Input
                id="destinatario_direccion"
                placeholder="Calle, número, localidad"
                {...register("destinatario_direccion")}
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="notas">Observaciones</Label>
              <Textarea
                id="notas"
                rows={2}
                placeholder="Ej: entregar en horario de mañana"
                {...register("notas")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Mercadería */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Mercadería</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(remitoItemDefaults)}
            >
              <Plus className="h-4 w-4" />
              Agregar ítem
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Agregá al menos un ítem al remito.
              </p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border p-3">
                <div className="grid gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">Producto del catálogo (opcional)</Label>
                    <Combobox
                      options={catalogoOptions}
                      value={itemKeys[index] ?? null}
                      onSelect={(key) => onSelectCatalogo(index, key)}
                      placeholder="Elegir del catálogo (o escribir descripción libre)"
                      searchPlaceholder="Buscar producto o variante..."
                      emptyText="Sin coincidencias. Podés escribir la descripción a mano."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_90px_100px_120px_110px_auto] sm:items-end">
                    <div className="col-span-2 grid gap-1 sm:col-span-1">
                      <Label className="text-xs">Descripción *</Label>
                      <Input className="h-8" {...register(`items.${index}.descripcion`)} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        className="h-8"
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`items.${index}.cantidad`)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Unidad</Label>
                      <Input
                        className="h-8"
                        placeholder="unidad, caja..."
                        {...register(`items.${index}.unidad`)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Precio unit.</Label>
                      <Input
                        className="h-8"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Opcional"
                        {...register(`items.${index}.precio_unitario`)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Subtotal</Label>
                      <div className="flex h-8 items-center text-sm tabular-nums text-muted-foreground">
                        {watchedItems?.[index]?.precio_unitario?.trim()
                          ? formatCurrency(
                              (Number(watchedItems[index]?.cantidad) || 0) *
                                (Number(watchedItems[index]?.precio_unitario) || 0),
                            )
                          : "—"}
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
          </CardContent>
        </Card>
      </div>

      {/* Columna resumen (sticky) */}
      <div className="lg:col-span-1">
        <Card className="lg:sticky lg:top-8">
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Renglones</span>
              <span className="tabular-nums">{watchedItems?.length ?? 0}</span>
            </div>
            {hayPrecios && (
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              El precio por renglón es opcional. El remito documenta el envío de mercadería:
              no modifica stock ni la cuenta corriente del cliente.
            </p>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear remito y descargar PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
