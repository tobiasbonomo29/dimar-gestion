"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADOS_PEDIDO, ESTADOS_PEDIDO_LIST } from "@/lib/constants";
import type { EstadoPedido } from "@/types/database";
import { cambiarEstadoPedido } from "../actions";

interface Props {
  pedidoId: string;
  estadoActual: EstadoPedido;
  /** "trigger" = altura normal; "sm" = compacto para tarjetas del kanban. */
  size?: "default" | "sm";
}

export function CambiarEstado({ pedidoId, estadoActual, size = "default" }: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState<EstadoPedido | null>(null);
  const [nota, setNota] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function onSelect(value: string) {
    const nuevo = value as EstadoPedido;
    if (nuevo === estadoActual) return;
    setNota("");
    setPending(nuevo);
  }

  async function confirmar() {
    if (!pending) return;
    setSaving(true);
    const result = await cambiarEstadoPedido(pedidoId, pending, nota);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Estado actualizado a “${ESTADOS_PEDIDO[pending].label}”`);
    setPending(null);
    router.refresh();
  }

  return (
    <>
      <Select value={estadoActual} onValueChange={onSelect}>
        <SelectTrigger className={size === "sm" ? "h-7 text-xs" : ""}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ESTADOS_PEDIDO_LIST.map((e) => (
            <SelectItem key={e} value={e}>
              {ESTADOS_PEDIDO[e].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={Boolean(pending)} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Cambiar estado</DialogTitle>
            <DialogDescription>
              De “{ESTADOS_PEDIDO[estadoActual].label}” a “
              {pending ? ESTADOS_PEDIDO[pending].label : ""}”. Podés dejar una nota
              (opcional) que quedará en el historial.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="nota-estado">Nota</Label>
            <Textarea
              id="nota-estado"
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: confirmado por mail, entrega coordinada para el viernes"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPending(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
