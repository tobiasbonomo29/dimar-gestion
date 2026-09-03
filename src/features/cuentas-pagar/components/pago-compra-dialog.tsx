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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEDIOS_PAGO } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { FacturaCompraRow } from "../queries";
import { registrarPagoCompra } from "../actions";
import type { PagoCompraFormValues } from "../schema";

export function PagoCompraDialog({
  factura,
  onOpenChange,
}: {
  factura: FacturaCompraRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } =
    useForm<PagoCompraFormValues>({
      defaultValues: { monto: "", fecha: new Date().toISOString().slice(0, 10), medio_pago: "transferencia", nota: "" },
    });
  const medio = watch("medio_pago");

  React.useEffect(() => {
    if (factura) {
      reset({
        monto: String(factura.saldo),
        fecha: new Date().toISOString().slice(0, 10),
        medio_pago: "transferencia",
        nota: "",
      });
    }
  }, [factura, reset]);

  async function onSubmit(values: PagoCompraFormValues) {
    if (!factura) return;
    const r = await registrarPagoCompra(factura.id, values);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Pago registrado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={factura !== null} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {factura
              ? `${factura.proveedor} · saldo ${formatCurrency(factura.saldo)}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="monto">Monto *</Label>
              <Input id="monto" type="number" step="0.01" min="0.01" autoFocus {...register("monto")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="medio_pago">Medio de pago</Label>
            <Select value={medio} onValueChange={(v) => setValue("medio_pago", v as PagoCompraFormValues["medio_pago"])}>
              <SelectTrigger id="medio_pago">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEDIOS_PAGO).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              Registrar pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
