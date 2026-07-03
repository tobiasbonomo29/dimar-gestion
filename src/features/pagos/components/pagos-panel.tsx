"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MEDIOS_PAGO } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Pago } from "@/types/database";
import { PagoFormDialog } from "./pago-form-dialog";
import { eliminarPago } from "../actions";

interface Props {
  clienteId: string;
  pagos: Pago[];
  pedidosPendientes: { id: string; numero: number; pendiente: number }[];
}

export function PagosPanel({ clienteId, pagos, pedidosPendientes }: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Pago | null>(null);

  async function handleDelete() {
    if (!toDelete) return;
    const result = await eliminarPago(toDelete.id, clienteId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Pago eliminado");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pagos.length === 0 ? "Sin pagos registrados." : `${pagos.length} pago(s)`}
        </p>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Registrar pago
        </Button>
      </div>

      {pagos.length > 0 && (
        <div className="space-y-2">
          {pagos.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">{formatCurrency(p.monto)}</span>
                  <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                    {MEDIOS_PAGO[p.medio_pago]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(p.fecha)}
                  {p.nota ? ` · ${p.nota}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                onClick={() => setToDelete(p)}
                aria-label="Eliminar pago"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <PagoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        clienteId={clienteId}
        pedidosPendientes={pedidosPendientes}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar pago"
        description={`¿Seguro que querés eliminar el pago de ${toDelete ? formatCurrency(toDelete.monto) : ""}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
