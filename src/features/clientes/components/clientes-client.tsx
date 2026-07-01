"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CONDICIONES_FISCALES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Cliente } from "@/types/database";
import { ClienteFormDialog } from "./cliente-form-dialog";
import { deleteCliente } from "../actions";

export function ClientesClient({ clientes }: { clientes: Cliente[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Cliente | null>(null);
  const [toDelete, setToDelete] = React.useState<Cliente | null>(null);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(cliente: Cliente) {
    setEditing(cliente);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    const result = await deleteCliente(toDelete.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Cliente eliminado");
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Razón social</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Cond. fiscal</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead className="w-[90px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No hay clientes. Creá el primero con “Nuevo cliente”.
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.razon_social}</TableCell>
                  <TableCell>{c.nombre_contacto ?? "—"}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.telefono ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                      {CONDICIONES_FISCALES[c.condicion_fiscal]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(c.fecha_alta)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(c)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(c)}
                        aria-label="Eliminar"
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

      <ClienteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        cliente={editing}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar cliente"
        description={`¿Seguro que querés eliminar a “${toDelete?.razon_social}”? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
