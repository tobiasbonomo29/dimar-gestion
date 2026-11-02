"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarFechaFacturacion } from "../actions";

/**
 * Día en que se facturó el pedido. Se completa solo al pasar a "Facturado";
 * se puede corregir si el pedido se marcó en el sistema días después.
 */
export function FechaFacturacion({ pedidoId, fecha }: { pedidoId: string; fecha: string | null }) {
  const router = useRouter();
  const [valor, setValor] = React.useState(fecha ?? "");
  const [guardando, setGuardando] = React.useState(false);

  React.useEffect(() => setValor(fecha ?? ""), [fecha]);

  async function guardar() {
    setGuardando(true);
    const res = await actualizarFechaFacturacion(pedidoId, valor);
    setGuardando(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Fecha de facturación actualizada");
    router.refresh();
  }

  return (
    <div className="grid gap-1.5 border-t pt-3">
      <Label htmlFor="fecha-facturacion" className="text-xs text-muted-foreground">
        Fecha de facturación (la venta se imputa a este día)
      </Label>
      <div className="flex gap-2">
        <Input
          id="fecha-facturacion"
          type="date"
          className="h-8"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={guardar}
          disabled={guardando || !valor || valor === fecha}
        >
          {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
