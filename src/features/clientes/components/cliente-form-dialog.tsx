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
import { CONDICIONES_FISCALES } from "@/lib/constants";
import type { Cliente } from "@/types/database";
import { createCliente, updateCliente } from "../actions";
import { clienteSchema, clienteDefaults, type ClienteFormValues } from "../schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: Cliente | null;
  /** Callback opcional con el cliente creado (para encadenar desde pedidos). */
  onCreated?: (id: string, razonSocial: string) => void;
}

function toFormValues(c: Cliente): ClienteFormValues {
  return {
    razon_social: c.razon_social,
    nombre_contacto: c.nombre_contacto ?? undefined,
    email: c.email ?? undefined,
    telefono: c.telefono ?? undefined,
    condicion_fiscal: c.condicion_fiscal,
    cuit: c.cuit ?? undefined,
    direccion: c.direccion ?? undefined,
    notas: c.notas ?? undefined,
  };
}

export function ClienteFormDialog({ open, onOpenChange, cliente, onCreated }: Props) {
  const router = useRouter();
  const isEdit = Boolean(cliente);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: clienteDefaults,
  });

  // Rellena/limpia el formulario cada vez que se abre.
  React.useEffect(() => {
    if (open) {
      reset(cliente ? toFormValues(cliente) : clienteDefaults);
    }
  }, [open, cliente, reset]);

  const condicion = watch("condicion_fiscal");

  async function onSubmit(values: ClienteFormValues) {
    if (isEdit) {
      const result = await updateCliente(cliente!.id, values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cliente actualizado");
    } else {
      const result = await createCliente(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cliente creado");
      onCreated?.(result.data.id, values.razon_social);
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modificá los datos del cliente."
              : "Cargá los datos mínimos. Solo la razón social es obligatoria."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="razon_social">Razón social *</Label>
            <Input
              id="razon_social"
              autoFocus
              placeholder="Ej: Frigorífico del Sur SA"
              {...register("razon_social")}
            />
            {errors.razon_social && (
              <p className="text-xs text-destructive">{errors.razon_social.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nombre_contacto">Nombre de contacto</Label>
              <Input id="nombre_contacto" {...register("nombre_contacto")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" {...register("telefono")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="condicion_fiscal">Condición fiscal</Label>
              <Select
                value={condicion}
                onValueChange={(v) =>
                  setValue("condicion_fiscal", v as ClienteFormValues["condicion_fiscal"])
                }
              >
                <SelectTrigger id="condicion_fiscal">
                  <SelectValue placeholder="Elegir..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDICIONES_FISCALES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input id="cuit" placeholder="30-00000000-0" {...register("cuit")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" {...register("direccion")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" rows={2} {...register("notas")} />
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
              {isEdit ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
