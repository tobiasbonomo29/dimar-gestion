"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Vendedor } from "@/types/database";
import { crearVendedor, updateVendedor, toggleVendedor } from "../actions";
import type { VendedorFormValues } from "../schema";

export function VendedoresView({ vendedores }: { vendedores: Vendedor[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Vendedor | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<VendedorFormValues>({ defaultValues: { nombre: "", comision_porcentaje: "3" } });

  React.useEffect(() => {
    if (open) {
      reset(
        editing
          ? { nombre: editing.nombre, comision_porcentaje: String(editing.comision_porcentaje) }
          : { nombre: "", comision_porcentaje: "3" },
      );
    }
  }, [open, editing, reset]);

  async function onSubmit(values: VendedorFormValues) {
    const result = editing ? await updateVendedor(editing.id, values) : await crearVendedor(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Vendedor actualizado" : "Vendedor creado");
    setOpen(false);
    setEditing(null);
    router.refresh();
  }

  async function onToggle(v: Vendedor) {
    const result = await toggleVendedor(v.id, !v.activo);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo vendedor
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Comisión</TableHead>
              <TableHead className="w-[130px]">Estado</TableHead>
              <TableHead className="w-[60px] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendedores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No hay vendedores. Creá el primero.
                </TableCell>
              </TableRow>
            ) : (
              vendedores.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.comision_porcentaje}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={v.activo} onCheckedChange={() => onToggle(v)} />
                      <span className="text-xs text-muted-foreground">
                        {v.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditing(v);
                        setOpen(true);
                      }}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar vendedor" : "Nuevo vendedor"}</DialogTitle>
            <DialogDescription>
              La comisión se aplica al neto (venta sin IVA) de los pedidos facturados del vendedor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" autoFocus {...register("nombre")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comision">Comisión (%)</Label>
              <Input
                id="comision"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register("comision_porcentaje")}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
