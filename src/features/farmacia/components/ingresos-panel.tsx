"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileSpreadsheet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { exportToExcel } from "@/lib/export-excel";
import type { FarmIngreso, FarmTipoIngreso } from "@/types/database";
import { deleteIngreso } from "../actions";
import { IngresoFormDialog } from "./ingreso-form-dialog";

/** Tarjeta chica de total, reutilizada en la fila de resumen. */
function Total({ label, monto, destacado }: { label: string; monto: number; destacado?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={destacado ? "text-2xl font-bold tabular-nums" : "text-lg font-semibold tabular-nums"}>
          {formatCurrency(monto)}
        </p>
      </CardContent>
    </Card>
  );
}

export function IngresosPanel({
  ingresos,
  tipo,
  fechaDefault,
}: {
  ingresos: FarmIngreso[];
  /** "todos" = vista unificada (ventas + otros), cada fila una sola vez. */
  tipo: FarmTipoIngreso | "todos";
  /** Primer día del período: fecha por defecto al cargar uno nuevo. */
  fechaDefault: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [enEdicion, setEnEdicion] = React.useState<FarmIngreso | null>(null);
  const [aBorrar, setABorrar] = React.useState<FarmIngreso | null>(null);
  // Tipo con el que se abre el formulario: el de la fila en edición, o el
  // elegido al crear (en la vista unificada hay un botón por tipo).
  const [tipoForm, setTipoForm] = React.useState<FarmTipoIngreso>(tipo === "todos" ? "venta" : tipo);
  const esTodos = tipo === "todos";
  const esVenta = tipo === "venta";

  const totales = React.useMemo(() => {
    const t = { efectivo: 0, banco: 0, obraSocial: 0, total: 0 };
    for (const i of ingresos) {
      t.efectivo += Number(i.efectivo);
      t.banco += Number(i.banco);
      t.obraSocial += Number(i.obra_social);
      t.total += Number(i.total);
    }
    return t;
  }, [ingresos]);

  function abrirNuevo(t: FarmTipoIngreso) {
    setTipoForm(t);
    setEnEdicion(null);
    setOpen(true);
  }

  function abrirEdicion(i: FarmIngreso) {
    setTipoForm(i.tipo);
    setEnEdicion(i);
    setOpen(true);
  }

  function descargarExcel() {
    exportToExcel(
      ingresos.map((i) => ({
        Fecha: formatDate(i.fecha),
        ...(esTodos ? { Tipo: i.tipo === "venta" ? "Venta" : "Otro ingreso" } : {}),
        Semana: i.semana ?? "",
        Concepto: i.concepto,
        Efectivo: Number(i.efectivo),
        Banco: Number(i.banco),
        "Obra social": Number(i.obra_social),
        Total: Number(i.total),
        Nota: i.nota ?? "",
      })),
      esTodos ? "todos-los-ingresos" : esVenta ? "ingresos-por-venta" : "otros-ingresos",
      esTodos ? "Todos los ingresos" : esVenta ? "Ingresos por venta" : "Otros ingresos",
    );
  }

  async function handleDelete() {
    if (!aBorrar) return;
    const result = await deleteIngreso(aBorrar.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Ingreso eliminado");
    setABorrar(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {esTodos
            ? "Todo lo que entró en el mes, ventas y otros ingresos juntos, tal como se cargó."
            : esVenta
              ? "Ventas del mes con el detalle de cómo entró la plata."
              : "Ingresos que no son venta de mostrador: droguería, notas de crédito, convenios."}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={descargarExcel} disabled={ingresos.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          {esTodos ? (
            <>
              <Button variant="outline" onClick={() => abrirNuevo("otro")}>
                <Plus className="h-4 w-4" />
                Otro ingreso
              </Button>
              <Button onClick={() => abrirNuevo("venta")}>
                <Plus className="h-4 w-4" />
                Nueva venta
              </Button>
            </>
          ) : (
            <Button onClick={() => abrirNuevo(tipo)}>
              <Plus className="h-4 w-4" />
              Nuevo ingreso
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Total label="Efectivo" monto={totales.efectivo} />
        <Total label="Banco" monto={totales.banco} />
        <Total label={esTodos ? "Obra social / Droguería" : esVenta ? "Obra social" : "Droguería / OS"} monto={totales.obraSocial} />
        <Total label="Total del mes" monto={totales.total} destacado />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Fecha</TableHead>
              {esTodos && <TableHead className="w-[100px]">Tipo</TableHead>}
              <TableHead className="w-[110px]">Semana</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Efectivo</TableHead>
              <TableHead className="text-right">Banco</TableHead>
              <TableHead className="text-right">
                {esTodos ? "OS / Droguería" : esVenta ? "Obra social" : "Droguería"}
              </TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingresos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={esTodos ? 9 : 8} className="h-24 text-center text-muted-foreground">
                  Sin ingresos cargados en este mes.
                </TableCell>
              </TableRow>
            ) : (
              ingresos.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-muted-foreground">{formatDate(i.fecha)}</TableCell>
                  {esTodos && (
                    <TableCell>
                      <Badge className={i.tipo === "venta" ? "" : "text-muted-foreground"}>
                        {i.tipo === "venta" ? "Venta" : "Otro"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">{i.semana ?? "—"}</TableCell>
                  <TableCell className="font-medium">{i.concepto}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {Number(i.efectivo) > 0 ? formatCurrency(i.efectivo) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {Number(i.banco) > 0 ? formatCurrency(i.banco) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {Number(i.obra_social) > 0 ? formatCurrency(i.obra_social) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(i.total)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => abrirEdicion(i)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setABorrar(i)}
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

      <IngresoFormDialog
        open={open}
        onOpenChange={setOpen}
        tipo={tipoForm}
        fechaDefault={fechaDefault}
        ingreso={enEdicion}
      />

      <ConfirmDialog
        open={aBorrar !== null}
        onOpenChange={(o) => !o && setABorrar(null)}
        title="Eliminar ingreso"
        description={
          aBorrar ? `Se eliminará "${aBorrar.concepto}" (${formatCurrency(aBorrar.total)}).` : undefined
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
