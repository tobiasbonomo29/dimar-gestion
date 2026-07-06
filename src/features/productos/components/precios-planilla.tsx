"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { ProductoConVariantes } from "../queries";
import { getProductoNombre } from "../display";
import { bulkUpdatePrecios } from "../actions";

type PrecioMap = Record<string, string>;

// Construye el estado inicial: "p:{id}" para producto, "v:{id}" para variante.
function buildInitial(productos: ProductoConVariantes[]): PrecioMap {
  const map: PrecioMap = {};
  for (const p of productos) {
    map[`p:${p.id}`] = String(p.precio_base);
    for (const v of p.producto_variantes) {
      map[`v:${v.id}`] = v.precio != null ? String(v.precio) : "";
    }
  }
  return map;
}

export function PreciosPlanilla({ productos }: { productos: ProductoConVariantes[] }) {
  const router = useRouter();
  const initial = React.useMemo(() => buildInitial(productos), [productos]);
  const [values, setValues] = React.useState<PrecioMap>(initial);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setValues(initial), [initial]);

  const dirtyKeys = React.useMemo(
    () => Object.keys(values).filter((k) => values[k] !== initial[k]),
    [values, initial],
  );
  const isDirty = dirtyKeys.length > 0;

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    // Junta solo lo que cambió.
    const productosPayload: { id: string; precio_base: number }[] = [];
    const variantesPayload: { id: string; precio: number | null }[] = [];

    for (const key of dirtyKeys) {
      const [tipo, id] = key.split(":");
      const raw = values[key].trim();
      if (tipo === "p") {
        const n = Number(raw);
        if (raw === "" || Number.isNaN(n) || n < 0) {
          toast.error("Hay precios base vacíos o inválidos.");
          return;
        }
        productosPayload.push({ id, precio_base: n });
      } else {
        // Variante: vacío = null (usa precio base).
        if (raw === "") {
          variantesPayload.push({ id, precio: null });
        } else {
          const n = Number(raw);
          if (Number.isNaN(n) || n < 0) {
            toast.error("Hay precios de variante inválidos.");
            return;
          }
          variantesPayload.push({ id, precio: n });
        }
      }
    }

    setSaving(true);
    const result = await bulkUpdatePrecios({
      productos: productosPayload,
      variantes: variantesPayload,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.data.actualizados} precio(s) actualizado(s)`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isDirty
            ? `${dirtyKeys.length} cambio(s) sin guardar`
            : "Editá los precios y guardá todo junto."}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setValues(initial)}
            disabled={!isDirty || saving}
          >
            <RotateCcw className="h-4 w-4" />
            Descartar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isDirty || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto / Variante</TableHead>
              <TableHead className="w-[220px]">Precio actual</TableHead>
              <TableHead className="w-[200px]">Nuevo precio (ARS)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No hay productos cargados.
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p) => (
                <React.Fragment key={p.id}>
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">{getProductoNombre(p)}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatCurrency(p.precio_base)}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        type="number"
                        step="0.01"
                        min="0"
                        value={values[`p:${p.id}`] ?? ""}
                        onChange={(e) => setValue(`p:${p.id}`, e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                  {p.producto_variantes.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="pl-8 text-sm text-muted-foreground">
                        ↳ {v.nombre}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {v.precio != null ? (
                          formatCurrency(v.precio)
                        ) : (
                          <span className="italic">usa base ({formatCurrency(p.precio_base)})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="usa base"
                          value={values[`v:${v.id}`] ?? ""}
                          onChange={(e) => setValue(`v:${v.id}`, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
