"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

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
import { formatDate } from "@/lib/format";
import type { RemitoConItems } from "../queries";
import { DescargarRemitoButton } from "./descargar-remito";
import { deleteRemito } from "../actions";

export function RemitosView({ remitos }: { remitos: RemitoConItems[] }) {
  const router = useRouter();
  const [aBorrar, setABorrar] = React.useState<RemitoConItems | null>(null);

  async function handleDelete() {
    if (!aBorrar) return;
    const result = await deleteRemito(aBorrar.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Remito N° ${String(aBorrar.numero).padStart(4, "0")} eliminado`);
    router.refresh();
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">N°</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Destinatario</TableHead>
              <TableHead className="text-right">Ítems</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {remitos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Todavía no hay remitos. Creá el primero con “Nuevo remito”.
                </TableCell>
              </TableRow>
            ) : (
              remitos.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    #{String(r.numero).padStart(4, "0")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.fecha)}</TableCell>
                  <TableCell>
                    <span className="font-medium">{r.destinatario}</span>
                    {r.destinatario_direccion ? (
                      <span className="block text-xs text-muted-foreground">
                        {r.destinatario_direccion}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r.remito_items.length}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <DescargarRemitoButton remito={r} items={r.remito_items} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setABorrar(r)}
                        aria-label="Eliminar remito"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={aBorrar !== null}
        onOpenChange={(open) => !open && setABorrar(null)}
        title="Eliminar remito"
        description={
          aBorrar
            ? `Se eliminará el remito N° ${String(aBorrar.numero).padStart(4, "0")} de ${aBorrar.destinatario}. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
