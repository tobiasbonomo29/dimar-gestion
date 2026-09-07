"use client";

import * as React from "react";
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
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Insumo, RecetaItem } from "@/types/database";
import { registrarProduccion } from "../actions";

type Prod = { id: string; codigo: string | null; nombre: string; unidad_medida: string };

export function ProduccionFormDialog({
  open,
  onOpenChange,
  productos,
  recetasPorProducto,
  insumos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productos: Prod[];
  recetasPorProducto: Map<string, RecetaItem[]>;
  insumos: Insumo[];
}) {
  const router = useRouter();
  const [productoId, setProductoId] = React.useState("");
  const [cantidad, setCantidad] = React.useState("");
  const [fecha, setFecha] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [nota, setNota] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const insumoById = React.useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  React.useEffect(() => {
    if (open) {
      setProductoId(productos[0]?.id ?? "");
      setCantidad("");
      setFecha(new Date().toISOString().slice(0, 10));
      setNota("");
    }
  }, [open, productos]);

  const receta = productoId ? recetasPorProducto.get(productoId) ?? [] : [];
  const cant = Number(cantidad) || 0;

  // Máximo producible + consumo previsto por insumo.
  const lineas = receta.map((r) => {
    const ins = insumoById.get(r.insumo_id);
    const stock = Number(ins?.stock ?? 0);
    const consumo = cant * Number(r.cantidad);
    const alcanza = Number(r.cantidad) > 0 ? Math.floor(stock / Number(r.cantidad)) : Infinity;
    return {
      nombre: ins ? (ins.presentacion ? `${ins.nombre} · ${ins.presentacion}` : ins.nombre) : "insumo",
      unidad: ins?.unidad_medida ?? "",
      stock,
      consumo,
      alcanza,
      falta: consumo > stock + 1e-6,
    };
  });
  const maxProducible = lineas.length > 0 ? Math.min(...lineas.map((l) => l.alcanza)) : 0;
  const hayFalta = lineas.some((l) => l.falta);

  async function guardar() {
    if (!productoId) return toast.error("Elegí un producto.");
    if (cant <= 0) return toast.error("Ingresá la cantidad a producir.");
    setSaving(true);
    try {
      const r = await registrarProduccion(productoId, cant, { fecha, nota });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Producción registrada — stock actualizado");
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Registrar producción</DialogTitle>
          <DialogDescription>
            Descuenta la materia prima según la receta y suma el stock del producto terminado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px_150px]">
            <div className="grid gap-2">
              <Label htmlFor="prod">Producto</Label>
              <select id="prod" className="h-9 rounded-md border bg-transparent px-2 text-sm"
                value={productoId} onChange={(e) => setProductoId(e.target.value)}>
                {productos.length === 0 && <option value="">(sin recetas)</option>}
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cant">Cantidad</Label>
              <Input id="cant" type="number" step="1" min="0" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          {productoId && (
            <div className="rounded-md border">
              <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs">
                <span className="font-medium">Consumo previsto</span>
                <span className={cn("font-medium", maxProducible < cant && "text-red-600")}>
                  Máximo producible: {Number.isFinite(maxProducible) ? formatNumber(maxProducible) : "—"} u.
                </span>
              </div>
              {lineas.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">Este producto no tiene receta cargada.</p>
              ) : (
                <div className="divide-y">
                  {lineas.map((l, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-sm">
                      <span>{l.nombre}</span>
                      <span className={cn("tabular-nums", l.falta ? "text-red-600 font-medium" : "text-muted-foreground")}>
                        {formatNumber(l.consumo)} / {formatNumber(l.stock)} {l.unidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="nota">Nota</Label>
            <Textarea id="nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving || hayFalta || cant <= 0 || receta.length === 0}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar producción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
