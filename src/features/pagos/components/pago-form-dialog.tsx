"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { registrarPago } from "../actions";
import { pagoSchema, pagoDefaults, type PagoFormValues } from "../schema";

interface PedidoPendienteOpt {
  id: string;
  numero: number;
  pendiente: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  pedidosPendientes: PedidoPendienteOpt[];
}

export function PagoFormDialog({ open, onOpenChange, clienteId, pedidosPendientes }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PagoFormValues>({
    resolver: zodResolver(pagoSchema),
    defaultValues: pagoDefaults(clienteId),
  });

  React.useEffect(() => {
    if (open) reset(pagoDefaults(clienteId));
  }, [open, clienteId, reset]);

  const pedidoId = watch("pedido_id");
  const medioPago = watch("medio_pago");

  async function onSubmit(values: PagoFormValues) {
    const result = await registrarPago(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Pago registrado");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Se descuenta del saldo pendiente del cliente. Podés asociarlo a un pedido puntual o
            dejarlo como pago general.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="monto">Monto *</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0.01"
                autoFocus
                {...register("monto")}
              />
              {errors.monto && <p className="text-xs text-destructive">{errors.monto.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input id="fecha" type="date" {...register("fecha")} />
              {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="medio_pago">Medio de pago</Label>
              <Select
                value={medioPago}
                onValueChange={(v) => setValue("medio_pago", v as PagoFormValues["medio_pago"])}
              >
                <SelectTrigger id="medio_pago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEDIOS_PAGO).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pedido_id">Pedido (opcional)</Label>
              <Select
                value={pedidoId || "general"}
                onValueChange={(v) =>
                  setValue("pedido_id", v === "general" ? undefined : v)
                }
              >
                <SelectTrigger id="pedido_id">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Pago general</SelectItem>
                  {pedidosPendientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.numero} · pendiente {formatCurrency(p.pendiente)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nota">Nota</Label>
            <Textarea id="nota" rows={2} {...register("nota")} />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
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
