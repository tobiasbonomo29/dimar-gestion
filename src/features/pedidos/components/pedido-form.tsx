"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClienteFormDialog } from "@/features/clientes/components/cliente-form-dialog";
import { ORIGENES_PEDIDO } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { Cliente } from "@/types/database";
import type { ProductoConVariantes } from "@/features/productos/queries";
import { getProductoNombre } from "@/features/productos/display";
import { createPedido } from "../actions";
import {
  pedidoDefaults,
  pedidoItemDefaults,
  type PedidoFormValues,
} from "../schema";

interface Props {
  clientes: Cliente[];
  catalogo: ProductoConVariantes[];
}

// Opción de catálogo: producto ("p:id") o variante ("v:id").
type CatalogoEntry = {
  option: ComboboxOption;
  producto_id: string;
  variante_id: string | null;
  descripcion: string;
  precio: number;
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
    options.push({
      value: keyP,
      label: nombreP,
      description: `${formatCurrency(p.precio_base)} · Stock: ${p.stock}`,
    });
    map.set(keyP, {
      option: { value: keyP, label: nombreP },
      producto_id: p.id,
      variante_id: null,
      descripcion: productoNombre,
      precio: Number(p.precio_base),
    });

    for (const v of p.producto_variantes) {
      const keyV = `v:${v.id}`;
      const precio = v.precio != null ? Number(v.precio) : Number(p.precio_base);
      const label = `${nombreP} · ${v.nombre}`;
      options.push({ value: keyV, label, description: formatCurrency(precio) });
      map.set(keyV, {
        option: { value: keyV, label },
        producto_id: p.id,
        variante_id: v.id,
        descripcion: `${productoNombre} - ${v.nombre}`,
        precio,
      });
    }
  }
  return { options, map };
}

export function PedidoForm({ clientes, catalogo }: Props) {
  const router = useRouter();
  const [clienteDialogOpen, setClienteDialogOpen] = React.useState(false);
  // Clientes creados en esta sesión (antes de que refresque la data del server).
  const [extraClientes, setExtraClientes] = React.useState<ComboboxOption[]>([]);
  // Guarda qué opción de catálogo se eligió en cada fila (para el combobox).
  const [itemKeys, setItemKeys] = React.useState<Record<number, string>>({});

  const { options: catalogoOptions, map: catalogoMap } = React.useMemo(
    () => buildCatalogo(catalogo),
    [catalogo],
  );

  const clienteOptions = React.useMemo<ComboboxOption[]>(
    () => [
      ...clientes.map((c) => ({
        value: c.id,
        label: c.razon_social,
        description: [c.nombre_contacto, c.email].filter(Boolean).join(" · ") || undefined,
      })),
      ...extraClientes,
    ],
    [clientes, extraClientes],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<PedidoFormValues>({
    defaultValues: { ...pedidoDefaults, items: [pedidoItemDefaults] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // Totales en vivo (contemplan el descuento antes del IVA).
  const watchedItems = useWatch({ control, name: "items" });
  const watchedIva = useWatch({ control, name: "iva_porcentaje" });
  const watchedDescuento = useWatch({ control, name: "descuento_porcentaje" });

  const { neto, descuentoMonto, netoGravado, ivaMonto, total } = React.useMemo(() => {
    const neto = (watchedItems ?? []).reduce((acc, it) => {
      const cant = Number(it?.cantidad) || 0;
      const precio = Number(it?.precio_unitario) || 0;
      return acc + cant * precio;
    }, 0);
    const descPct = Number(watchedDescuento) || 0;
    const descuentoMonto = Math.round(neto * descPct) / 100;
    const netoGravado = neto - descuentoMonto;
    const ivaPct = Number(watchedIva) || 0;
    const ivaMonto = Math.round(netoGravado * ivaPct) / 100;
    return { neto, descuentoMonto, netoGravado, ivaMonto, total: netoGravado + ivaMonto };
  }, [watchedItems, watchedIva, watchedDescuento]);

  function onSelectCatalogo(index: number, key: string) {
    const entry = catalogoMap.get(key);
    if (!entry) return;
    setItemKeys((prev) => ({ ...prev, [index]: key }));
    setValue(`items.${index}.producto_id`, entry.producto_id);
    setValue(`items.${index}.variante_id`, entry.variante_id);
    setValue(`items.${index}.descripcion`, entry.descripcion);
    setValue(`items.${index}.precio_unitario`, String(entry.precio));
  }

  async function onSubmit(values: PedidoFormValues) {
    const result = await createPedido(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Pedido creado en estado “Cotizado”");
    router.push(`/pedidos/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
      {/* Columna principal */}
      <div className="space-y-6 lg:col-span-2">
        {/* Cliente + datos generales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del pedido</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Controller
                control={control}
                name="cliente_id"
                render={({ field }) => (
                  <Combobox
                    id="cliente"
                    options={clienteOptions}
                    value={field.value}
                    onSelect={field.onChange}
                    placeholder="Buscar o elegir cliente..."
                    searchPlaceholder="Buscar por razón social o email..."
                    emptyText="No hay clientes con ese nombre."
                    footer={
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setClienteDialogOpen(true)}
                      >
                        <UserPlus className="h-4 w-4" />
                        Crear nuevo cliente
                      </Button>
                    }
                  />
                )}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="origen">Origen</Label>
              <Controller
                control={control}
                name="origen"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="origen">
                      <SelectValue placeholder="¿Cómo llegó?" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORIGENES_PEDIDO).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fecha_entrega">Entrega estimada</Label>
              <Input id="fecha_entrega" type="date" {...register("fecha_estimada_entrega")} />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                rows={2}
                placeholder="Ej: cliente pidió packaging especial"
                {...register("notas")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ítems */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Ítems</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(pedidoItemDefaults)}
            >
              <Plus className="h-4 w-4" />
              Agregar ítem
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Agregá al menos un ítem al pedido.
              </p>
            )}
            {fields.map((field, index) => {
              const cant = Number(watchedItems?.[index]?.cantidad) || 0;
              const precio = Number(watchedItems?.[index]?.precio_unitario) || 0;
              return (
                <div key={field.id} className="rounded-lg border p-3">
                  <div className="grid gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Producto del catálogo</Label>
                      <Combobox
                        options={catalogoOptions}
                        value={itemKeys[index] ?? null}
                        onSelect={(key) => onSelectCatalogo(index, key)}
                        placeholder="Elegir del catálogo (o escribir descripción libre)"
                        searchPlaceholder="Buscar producto o variante..."
                        emptyText="Sin coincidencias. Podés escribir la descripción a mano."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_100px_140px_120px_auto] sm:items-end">
                      <div className="col-span-2 grid gap-1 sm:col-span-1">
                        <Label className="text-xs">Descripción *</Label>
                        <Input
                          className="h-8"
                          {...register(`items.${index}.descripcion`)}
                        />
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
                        <Label className="text-xs">Precio unit.</Label>
                        <Input
                          className="h-8"
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`items.${index}.precio_unitario`)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Subtotal</Label>
                        <div className="flex h-8 items-center text-sm tabular-nums">
                          {formatCurrency(cant * precio)}
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
              );
            })}
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
              <span className="text-muted-foreground">Neto</span>
              <span className="tabular-nums">{formatCurrency(neto)}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Descuento</span>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    className="h-7 w-16"
                    {...register("descuento_porcentaje")}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <span className="tabular-nums text-muted-foreground">
                  −{formatCurrency(descuentoMonto)}
                </span>
              </div>
              <div className="flex gap-1">
                {["0", "10", "20"].map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 flex-1 px-0 text-xs"
                    onClick={() => setValue("descuento_porcentaje", v)}
                  >
                    {v === "0" ? "Sin desc." : `${v}%`}
                  </Button>
                ))}
              </div>
            </div>

            {descuentoMonto > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Neto con descuento</span>
                <span className="tabular-nums">{formatCurrency(netoGravado)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">IVA</span>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="h-7 w-16"
                  {...register("iva_porcentaje")}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <span className="tabular-nums">{formatCurrency(ivaMonto)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear pedido
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              El pedido se crea en estado “Cotizado”.
            </p>
          </CardContent>
        </Card>
      </div>

      <ClienteFormDialog
        open={clienteDialogOpen}
        onOpenChange={setClienteDialogOpen}
        onCreated={(id, razonSocial) => {
          setExtraClientes((prev) => [...prev, { value: id, label: razonSocial }]);
          setValue("cliente_id", id);
        }}
      />
    </form>
  );
}
