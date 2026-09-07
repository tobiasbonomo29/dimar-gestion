"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

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
import type { Insumo, RecetaItem } from "@/types/database";
import { guardarReceta } from "../actions";

type Prod = { id: string; codigo: string | null; nombre: string; unidad_medida: string };
type Linea = { insumo_id: string; cantidad: string };

export function RecetaFormDialog({
  producto,
  insumos,
  lineasActuales,
  onOpenChange,
}: {
  producto: Prod | null;
  insumos: Insumo[];
  lineasActuales: RecetaItem[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [lineas, setLineas] = React.useState<Linea[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (producto) {
      setLineas(
        lineasActuales.length > 0
          ? lineasActuales.map((l) => ({ insumo_id: l.insumo_id, cantidad: String(l.cantidad) }))
          : [{ insumo_id: "", cantidad: "" }],
      );
    }
  }, [producto, lineasActuales]);

  function set(i: number, patch: Partial<Linea>) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function guardar() {
    if (!producto) return;
    const payload = lineas
      .filter((l) => l.insumo_id && Number(l.cantidad) > 0)
      .map((l) => ({ insumo_id: l.insumo_id, cantidad: Number(l.cantidad) }));
    setSaving(true);
    try {
      const r = await guardarReceta(producto.id, payload);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Receta guardada");
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={producto !== null} onOpenChange={(o) => !saving && !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Receta {producto ? `· ${producto.nombre}` : ""}</DialogTitle>
          <DialogDescription>
            Cuánto consume <b>por cada unidad</b> del producto. Ej: si una caja de 120 u. usa 0,36 kg
            de film, cargá 0,003 kg por unidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_130px_auto] gap-2 text-xs font-medium text-muted-foreground">
            <span>Insumo</span>
            <span>Consumo x unidad</span>
            <span />
          </div>
          {lineas.map((l, i) => {
            const ins = insumos.find((x) => x.id === l.insumo_id);
            return (
              <div key={i} className="grid grid-cols-[1fr_130px_auto] items-center gap-2">
                <select
                  className="h-9 rounded-md border bg-transparent px-2 text-sm"
                  value={l.insumo_id}
                  onChange={(e) => set(i, { insumo_id: e.target.value })}
                >
                  <option value="">— elegir insumo —</option>
                  {insumos.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre}{x.presentacion ? ` · ${x.presentacion}` : ""} ({x.unidad_medida})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <Input
                    className="h-9"
                    type="number"
                    step="0.000001"
                    min="0"
                    value={l.cantidad}
                    onChange={(e) => set(i, { cantidad: e.target.value })}
                  />
                  <span className="w-8 shrink-0 text-xs text-muted-foreground">{ins?.unidad_medida ?? ""}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                  onClick={() => setLineas((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Quitar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={() => setLineas((p) => [...p, { insumo_id: "", cantidad: "" }])}>
            <Plus className="h-4 w-4" />
            Agregar insumo
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar receta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
