"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MEDIOS_PAGO, TIPOS_EGRESO } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Egreso, TipoEgreso } from "@/types/database";
import { EgresoFormDialog } from "./egreso-form-dialog";
import { deleteEgreso } from "../actions";

export function EgresosPanel({ egresos, tipo }: { egresos: Egreso[]; tipo: TipoEgreso }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [aBorrar, setABorrar] = React.useState<Egreso | null>(null);

  const total = egresos.reduce((a, e) => a + Number(e.monto), 0);
  const esCompra = tipo === "compra";

  async function handleDelete() {
    if (!aBorrar) return;
    const result = await deleteEgreso(aBorrar.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${TIPOS_EGRESO[tipo]} eliminada`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {egresos.length} {egresos.length === 1 ? "registro" : "registros"} · Total{" "}
          <span className="font-medium tabular-nums text-foreground">{formatCurrency(total)}</span>
        </p>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nueva {esCompra ? "compra" : "erogación"}
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Fecha</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>{esCompra ? "Proveedor" : "Destinatario"}</TableHead>
              <TableHead>Medio</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-[48px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {egresos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Todavía no hay {esCompra ? "compras" : "erogaciones"}. Cargá la primera.
                </TableCell>
              </TableRow>
            ) : (
              egresos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{formatDate(e.fecha)}</TableCell>
                  <TableCell className="font-medium">{e.concepto}</TableCell>
                  <TableCell className="text-muted-foreground">{e.categoria ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.proveedor ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{MEDIOS_PAGO[e.medio_pago]}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(e.monto)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setABorrar(e)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EgresoFormDialog open={formOpen} onOpenChange={setFormOpen} tipo={tipo} />
      <ConfirmDialog
        open={aBorrar !== null}
        onOpenChange={(open) => !open && setABorrar(null)}
        title={`Eliminar ${esCompra ? "compra" : "erogación"}`}
        description={
          aBorrar ? `Se eliminará "${aBorrar.concepto}" (${formatCurrency(aBorrar.monto)}).` : undefined
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
