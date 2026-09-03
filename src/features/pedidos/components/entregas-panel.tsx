"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, Loader2, PackageCheck } from "lucide-react";

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
import { formatDate, formatNumber } from "@/lib/format";
import type { PedidoDetalle } from "../queries";
import { registrarEntrega } from "../actions";

export function EntregasPanel({ pedido }: { pedido: PedidoDetalle }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [fecha, setFecha] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [nota, setNota] = React.useState("");
  const [cant, setCant] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const pendientes = pedido.pedido_items
    .map((it) => ({ ...it, pendiente: Number(it.cantidad) - Number(it.cantidad_entregada) }))
    .filter((it) => it.pendiente > 0.0001);
  const todoEntregado = pendientes.length === 0;
  const anulado = pedido.estado === "cancelado";

  function abrir() {
    // Precarga cada ítem con su cantidad pendiente.
    const init: Record<string, string> = {};
    for (const it of pendientes) init[it.id] = String(it.pendiente);
    setCant(init);
    setFecha(new Date().toISOString().slice(0, 10));
    setNota("");
    setOpen(true);
  }

  async function guardar() {
    const items = Object.entries(cant)
      .map(([pedido_item_id, v]) => ({ pedido_item_id, cantidad: Number(v) || 0 }))
      .filter((i) => i.cantidad > 0);
    if (items.length === 0) {
      toast.error("Cargá al menos una cantidad.");
      return;
    }
    setSaving(true);
    try {
      const r = await registrarEntrega(pedido.id, { fecha, nota, items });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Entrega registrada");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {todoEntregado ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <PackageCheck className="h-4 w-4 text-[var(--viz-pos,#0ca30c)]" />
          Todo el pedido fue entregado.
        </p>
      ) : (
        <Button variant="outline" className="w-full" onClick={abrir} disabled={anulado}>
          <Truck className="h-4 w-4" />
          Registrar entrega
        </Button>
      )}

      {/* Historial de entregas */}
      {pedido.entregas.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          {pedido.entregas.map((e) => (
            <div key={e.id} className="text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Entrega {formatDate(e.fecha)}</span>
                <span className="text-xs text-muted-foreground">
                  {e.entrega_items.length} {e.entrega_items.length === 1 ? "ítem" : "ítems"}
                </span>
              </div>
              <ul className="mt-0.5 pl-1 text-xs text-muted-foreground">
                {e.entrega_items.map((ei) => (
                  <li key={ei.id}>
                    {formatNumber(ei.cantidad)} × {ei.descripcion}
                  </li>
                ))}
              </ul>
              {e.nota && <p className="pl-1 text-xs italic text-muted-foreground">{e.nota}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Registrar entrega</DialogTitle>
            <DialogDescription>
              Cargá cuánto entregás ahora de cada ítem. Podés entregar parcial: el resto queda
              pendiente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2 sm:max-w-[200px]">
              <Label htmlFor="fecha-entrega">Fecha</Label>
              <Input id="fecha-entrega" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>

            <div className="rounded-md border">
              <div className="grid grid-cols-[1fr_80px_110px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Ítem</span>
                <span className="text-right">Pendiente</span>
                <span className="text-right">Entregar</span>
              </div>
              {pendientes.map((it) => (
                <div key={it.id} className="grid grid-cols-[1fr_80px_110px] items-center gap-2 px-3 py-2 text-sm">
                  <span>{it.descripcion}</span>
                  <span className="text-right tabular-nums text-muted-foreground">{formatNumber(it.pendiente)}</span>
                  <Input
                    className="h-8 text-right"
                    type="number"
                    step="0.01"
                    min="0"
                    max={it.pendiente}
                    value={cant[it.id] ?? ""}
                    onChange={(e) => setCant((p) => ({ ...p, [it.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nota-entrega">Nota</Label>
              <Textarea id="nota-entrega" rows={2} value={nota} onChange={(e) => setNota(e.target.value)}
                placeholder="Ej: falta producir 200 u. del gel 800g" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={guardar} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
