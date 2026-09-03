"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { crearFacturaCompra } from "../actions";
import { facturaCompraDefaults, type FacturaCompraFormValues } from "../schema";

export function FacturaCompraFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FacturaCompraFormValues>({
    defaultValues: facturaCompraDefaults,
  });

  React.useEffect(() => {
    if (open) reset(facturaCompraDefaults);
  }, [open, reset]);

  async function onSubmit(values: FacturaCompraFormValues) {
    const r = await crearFacturaCompra(values);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Factura de compra cargada");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nueva factura de compra</DialogTitle>
          <DialogDescription>Cargá una factura que tenés que pagar a un proveedor.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="proveedor">Proveedor *</Label>
            <Input id="proveedor" autoFocus placeholder="Ej: Corrucart SRL" {...register("proveedor")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="numero">N° de factura</Label>
              <Input id="numero" placeholder="Ej: A-0001-00012345" {...register("numero")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="monto">Monto *</Label>
              <Input id="monto" type="number" step="0.01" min="0" {...register("monto")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="fecha">Fecha de la factura</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vencimiento">Vencimiento</Label>
              <Input id="vencimiento" type="date" {...register("vencimiento")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nota">Nota</Label>
            <Textarea id="nota" rows={2} {...register("nota")} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Cargar factura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
