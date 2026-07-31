"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

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
import type { PuntoVenta } from "@/types/database";
import { crearPuntoVenta, togglePuntoVenta } from "../actions";
import type { PuntoVentaFormValues } from "../schema";

export function PuntosVentaView({ puntos }: { puntos: PuntoVenta[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<PuntoVentaFormValues>({ defaultValues: { numero: "", nombre: "" } });

  React.useEffect(() => {
    if (open) reset({ numero: "", nombre: "" });
  }, [open, reset]);

  async function onSubmit(values: PuntoVentaFormValues) {
    const result = await crearPuntoVenta(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Punto de venta creado");
    setOpen(false);
    router.refresh();
  }

  async function onToggle(pv: PuntoVenta) {
    const result = await togglePuntoVenta(pv.id, !pv.activo);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo punto de venta
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Número</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-[120px]">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {puntos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No hay puntos de venta. Creá el primero.
                </TableCell>
              </TableRow>
            ) : (
              puntos.map((pv) => (
                <TableRow key={pv.id}>
                  <TableCell className="font-mono font-medium">
                    {String(pv.numero).padStart(4, "0")}
                  </TableCell>
                  <TableCell>{pv.nombre ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={pv.activo} onCheckedChange={() => onToggle(pv)} />
                      <span className="text-xs text-muted-foreground">
                        {pv.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Nuevo punto de venta</DialogTitle>
            <DialogDescription>
              El número identifica el PV en los comprobantes (ej. 2 → 0002). Cada
              PV numera sus remitos y facturas por separado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="numero">Número *</Label>
              <Input id="numero" type="number" min="1" autoFocus {...register("numero")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre (opcional)</Label>
              <Input id="nombre" placeholder="Ej: Sucursal Norte" {...register("nombre")} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
