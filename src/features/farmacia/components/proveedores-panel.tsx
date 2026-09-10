"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FARM_CATEGORIAS_PROVEEDOR } from "@/lib/constants";
import { exportToExcel } from "@/lib/export-excel";
import type { FarmProveedor } from "@/types/database";
import { createProveedor, deleteProveedor, updateProveedor } from "../actions";
import { proveedorDefaults, type ProveedorFormValues } from "../schema";

function toFormValues(p: FarmProveedor): ProveedorFormValues {
  return {
    nombre: p.nombre,
    categoria: p.categoria ?? "",
    contacto: p.contacto ?? "",
    tipo_pago: p.tipo_pago ?? "",
    telefono: p.telefono ?? "",
    email: p.email ?? "",
    cuit: p.cuit ?? "",
    notas: p.notas ?? "",
    activo: p.activo,
  };
}

export function ProveedoresPanel({ proveedores }: { proveedores: FarmProveedor[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [enEdicion, setEnEdicion] = React.useState<FarmProveedor | null>(null);
  const [aBorrar, setABorrar] = React.useState<FarmProveedor | null>(null);
  const [busqueda, setBusqueda] = React.useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<ProveedorFormValues>({ defaultValues: proveedorDefaults() });

  React.useEffect(() => {
    if (open) reset(enEdicion ? toFormValues(enEdicion) : proveedorDefaults());
  }, [open, enEdicion, reset]);

  const activo = watch("activo");

  const visibles = React.useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter((p) =>
      [p.nombre, p.categoria, p.contacto, p.cuit].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [proveedores, busqueda]);

  async function onSubmit(values: ProveedorFormValues) {
    const result = enEdicion
      ? await updateProveedor(enEdicion.id, values)
      : await createProveedor(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(enEdicion ? "Proveedor actualizado" : "Proveedor agregado");
    setOpen(false);
    setEnEdicion(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!aBorrar) return;
    const result = await deleteProveedor(aBorrar.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Proveedor eliminado");
    setABorrar(null);
    router.refresh();
  }

  function descargarExcel() {
    exportToExcel(
      proveedores.map((p) => ({
        Nombre: p.nombre,
        Categoría: p.categoria ?? "",
        Contacto: p.contacto ?? "",
        "Tipo de pago": p.tipo_pago ?? "",
        Teléfono: p.telefono ?? "",
        Email: p.email ?? "",
        CUIT: p.cuit ?? "",
        Estado: p.activo ? "Activo" : "Inactivo",
        Notas: p.notas ?? "",
      })),
      "proveedores-farmacia",
      "Proveedores",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Buscar proveedor…"
          className="max-w-[280px]"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={descargarExcel} disabled={proveedores.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button
            onClick={() => {
              setEnEdicion(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo proveedor
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Tipo de pago</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {proveedores.length === 0
                    ? "Todavía no cargaste proveedores."
                    : "Ningún proveedor coincide con la búsqueda."}
                </TableCell>
              </TableRow>
            ) : (
              visibles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.nombre}</span>
                      {!p.activo && (
                        <Badge className="text-muted-foreground">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    {p.cuit && <div className="text-xs text-muted-foreground">CUIT {p.cuit}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.categoria ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.contacto ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.tipo_pago ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.telefono ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEnEdicion(p);
                          setOpen(true);
                        }}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setABorrar(p)}
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

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEnEdicion(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{enEdicion ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
            <DialogDescription>
              Solo el nombre es obligatorio: el resto se completa cuando lo tengas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" autoFocus placeholder="Ej: Asoprofarma" {...register("nombre")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Input
                  id="categoria"
                  list="farm-categorias-proveedor"
                  placeholder="Elegí o escribí una"
                  {...register("categoria")}
                />
                <datalist id="farm-categorias-proveedor">
                  {FARM_CATEGORIAS_PROVEEDOR.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipo_pago">Tipo de pago</Label>
                <Input
                  id="tipo_pago"
                  list="farm-tipos-pago"
                  placeholder="Ej: Transferencia"
                  {...register("tipo_pago")}
                />
                <datalist id="farm-tipos-pago">
                  {["Transferencia", "Efectivo", "Cheque", "Débito automático"].map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="contacto">Contacto</Label>
                <Input id="contacto" {...register("contacto")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" {...register("telefono")} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cuit">CUIT</Label>
                <Input id="cuit" {...register("cuit")} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="activo">Activo</Label>
              <Switch id="activo" checked={activo} onCheckedChange={(v) => setValue("activo", v)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" rows={2} {...register("notas")} />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={aBorrar !== null}
        onOpenChange={(o) => !o && setABorrar(null)}
        title="Eliminar proveedor"
        description={
          aBorrar
            ? `Se eliminará ${aBorrar.nombre}. Los egresos ya cargados se mantienen, pero pierden el vínculo.`
            : undefined
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
