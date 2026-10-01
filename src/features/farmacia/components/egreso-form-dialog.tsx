"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEDIOS_PAGO, FARM_RUBROS_EGRESO, FARM_CATEGORIAS_EGRESO } from "@/lib/constants";
import type {
  FarmCategoriaEgreso,
  FarmEgreso,
  FarmProveedor,
  FarmRubroEgreso,
} from "@/types/database";
import { createCategoriaEgreso, createEgreso, updateEgreso } from "../actions";
import { egresoDefaults, type EgresoFormValues } from "../schema";

/** Valor del select cuando el proveedor se escribe a mano en vez de elegirlo. */
const OTRO = "__otro__";
/** Valor del select de rubro que abre el alta de una categoría nueva. */
const NUEVA_CATEGORIA = "__nueva__";
/** Prefijo de los valores del select de rubro que son categorías del usuario. */
const CAT = "cat:";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedores: FarmProveedor[];
  /** Categorías creadas por el usuario; cada una completa rubro + categoría. */
  categorias: FarmCategoriaEgreso[];
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
  categorias,
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

  // Alta de categoría nueva (mini formulario dentro del diálogo). Las recién
  // creadas se guardan acá hasta que el refresh las traiga en `categorias`.
  const [creadas, setCreadas] = React.useState<FarmCategoriaEgreso[]>([]);
  const [nueva, setNueva] = React.useState(false);
  const [nuevoNombre, setNuevoNombre] = React.useState("");
  const [nuevoRubro, setNuevoRubro] = React.useState<FarmRubroEgreso>("variable");
  const [guardandoCat, setGuardandoCat] = React.useState(false);

  React.useEffect(() => {
    if (open) setNueva(false);
  }, [open]);

  const listaCategorias = React.useMemo(() => {
    const ids = new Set(categorias.map((c) => c.id));
    return [...categorias, ...creadas.filter((c) => !ids.has(c.id))].sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }, [categorias, creadas]);

  const rubro = watch("rubro");
  const categoria = watch("categoria");
  const medioPago = watch("medio_pago");

  // Si la categoría cargada es una del usuario (y del mismo rubro), el select
  // la muestra a ella; si no, muestra el rubro solo.
  const categoriaElegida = listaCategorias.find(
    (c) => c.rubro === rubro && c.nombre.toLowerCase() === (categoria ?? "").trim().toLowerCase(),
  );
  const valorRubro = categoriaElegida ? CAT + categoriaElegida.id : rubro;

  function elegirRubro(v: string) {
    if (v === NUEVA_CATEGORIA) {
      setNuevoNombre("");
      setNuevoRubro(rubro);
      setNueva(true);
      return;
    }
    if (v.startsWith(CAT)) {
      const c = listaCategorias.find((x) => CAT + x.id === v);
      if (!c) return;
      setValue("rubro", c.rubro);
      setValue("categoria", c.nombre);
      return;
    }
    setValue("rubro", v as FarmRubroEgreso);
    // Al volver a un rubro pelado, la categoría del usuario deja de aplicar.
    if (categoriaElegida) setValue("categoria", "");
  }

  async function guardarCategoria() {
    setGuardandoCat(true);
    const result = await createCategoriaEgreso({ nombre: nuevoNombre, rubro: nuevoRubro });
    setGuardandoCat(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCreadas((prev) => [...prev, result.data]);
    setValue("rubro", result.data.rubro);
    setValue("categoria", result.data.nombre);
    setNueva(false);
    toast.success(`Categoría "${result.data.nombre}" creada`);
    router.refresh();
  }
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
            <Select value={valorRubro} onValueChange={elegirRubro}>
              <SelectTrigger id="rubro">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FARM_RUBROS_EGRESO).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
                {listaCategorias.length > 0 && (
                  <SelectGroup>
                    <div className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                      Mis categorías
                    </div>
                    {listaCategorias.map((c) => (
                      <SelectItem key={c.id} value={CAT + c.id}>
                        {c.nombre}{" "}
                        <span className="text-muted-foreground">
                          · {FARM_RUBROS_EGRESO[c.rubro].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                <SelectItem value={NUEVA_CATEGORIA}>+ Nueva categoría…</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Va a: {FARM_RUBROS_EGRESO[rubro].linea}
            </p>

            {nueva && (
              <div className="grid gap-3 rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">Nueva categoría</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="nueva-categoria" className="text-xs">Nombre</Label>
                    <Input
                      id="nueva-categoria"
                      autoFocus
                      placeholder="Ej: Delivery"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      onKeyDown={(e) => {
                        // Enter crea la categoría, no manda el egreso.
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (nuevoNombre.trim()) guardarCategoria();
                        }
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nueva-categoria-rubro" className="text-xs">Cae en el rubro</Label>
                    <Select value={nuevoRubro} onValueChange={(v) => setNuevoRubro(v as FarmRubroEgreso)}>
                      <SelectTrigger id="nueva-categoria-rubro">
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
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  En el estado de resultados suma en: {FARM_RUBROS_EGRESO[nuevoRubro].linea}
                </p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setNueva(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={guardarCategoria}
                    disabled={guardandoCat || !nuevoNombre.trim()}
                  >
                    {guardandoCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Crear categoría
                  </Button>
                </div>
              </div>
            )}
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
                {[...new Set([...listaCategorias.map((c) => c.nombre), ...FARM_CATEGORIAS_EGRESO])].map(
                  (c) => (
                    <option key={c} value={c} />
                  ),
                )}
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
