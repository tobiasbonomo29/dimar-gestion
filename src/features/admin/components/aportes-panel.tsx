"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Landmark, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card, CardContent } from "@/components/ui/card";
import { ORIGENES_FONDOS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { exportToExcel } from "@/lib/export-excel";
import type { AporteCapital } from "@/types/database";
import { crearAporte, deleteAporte } from "../actions";
import { aporteDefaults, type AporteFormValues } from "../schema";

export function AportesPanel({ aportes, total }: { aportes: AporteCapital[]; total: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [aBorrar, setABorrar] = React.useState<AporteCapital | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<AporteFormValues>({ defaultValues: aporteDefaults() });

  React.useEffect(() => {
    if (open) reset(aporteDefaults());
  }, [open, reset]);

  const origen = watch("origen");

  async function onSubmit(values: AporteFormValues) {
    const result = await crearAporte(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Aporte registrado");
    setOpen(false);
    router.refresh();
  }

  function descargarExcel() {
    exportToExcel(
      aportes.map((a) => ({
        Fecha: formatDate(a.fecha),
        Aportante: a.aportante,
        Origen:
          a.origen && a.origen in ORIGENES_FONDOS
            ? ORIGENES_FONDOS[a.origen as keyof typeof ORIGENES_FONDOS]
            : a.origen ?? "",
        Monto: a.monto,
        Nota: a.nota ?? "",
      })),
      "aportes-capital",
      "Aportes de capital",
    );
  }

  async function handleDelete() {
    if (!aBorrar) return;
    const result = await deleteAporte(aBorrar.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Aporte eliminado");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Card className="flex-1">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
              <Landmark className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Aportes de capital del período</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground">
                {aportes.length} {aportes.length === 1 ? "aporte" : "aportes"}
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button variant="outline" onClick={descargarExcel} disabled={aportes.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo aporte
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Fecha</TableHead>
              <TableHead>Aportante</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-[48px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {aportes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Sin aportes de capital en el período.
                </TableCell>
              </TableRow>
            ) : (
              aportes.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground">{formatDate(a.fecha)}</TableCell>
                  <TableCell className="font-medium">{a.aportante}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.origen && a.origen in ORIGENES_FONDOS
                      ? ORIGENES_FONDOS[a.origen as keyof typeof ORIGENES_FONDOS]
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.nota ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatCurrency(a.monto)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setABorrar(a)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Nuevo aporte de capital</DialogTitle>
            <DialogDescription>
              Inyección de dinero que no es una venta. No entra al resultado operativo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="aportante">Quién lo hizo *</Label>
              <Input id="aportante" autoFocus placeholder="Ej: Martín Bonomo" {...register("aportante")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="monto">Monto *</Label>
                <Input id="monto" type="number" step="0.01" min="0" {...register("monto")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input id="fecha" type="date" {...register("fecha")} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="origen">Origen del dinero</Label>
              <Select value={origen} onValueChange={(v) => setValue("origen", v as AporteFormValues["origen"])}>
                <SelectTrigger id="origen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORIGENES_FONDOS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nota">Nota</Label>
              <Textarea id="nota" rows={2} {...register("nota")} />
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
        title="Eliminar aporte"
        description={aBorrar ? `Se eliminará el aporte de ${aBorrar.aportante} (${formatCurrency(aBorrar.monto)}).` : undefined}
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
