"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { FARM_RUBROS_EGRESO, MEDIOS_PAGO } from "@/lib/constants";
import { exportToExcel } from "@/lib/export-excel";
import type { FarmEgreso, FarmProveedor, FarmRubroEgreso } from "@/types/database";
import { deleteEgreso } from "../actions";
import { EgresoFormDialog } from "./egreso-form-dialog";

const TODOS = "__todos__";

export function EgresosPanel({
  egresos,
  proveedores,
  fechaDefault,
}: {
  egresos: FarmEgreso[];
  proveedores: FarmProveedor[];
  fechaDefault: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [enEdicion, setEnEdicion] = React.useState<FarmEgreso | null>(null);
  const [aBorrar, setABorrar] = React.useState<FarmEgreso | null>(null);
  const [filtro, setFiltro] = React.useState<string>(TODOS);

  const nombreProveedor = React.useCallback(
    (e: FarmEgreso) =>
      e.proveedor_id
        ? proveedores.find((p) => p.id === e.proveedor_id)?.nombre ?? e.proveedor ?? "—"
        : e.proveedor ?? "—",
    [proveedores],
  );

  const visibles = React.useMemo(
    () => (filtro === TODOS ? egresos : egresos.filter((e) => e.rubro === filtro)),
    [egresos, filtro],
  );

  const total = React.useMemo(
    () => visibles.reduce((acc, e) => acc + Number(e.monto), 0),
    [visibles],
  );
  const pendiente = React.useMemo(
    () => visibles.filter((e) => !e.pagado).reduce((acc, e) => acc + Number(e.monto), 0),
    [visibles],
  );

  function abrirNuevo() {
    setEnEdicion(null);
    setOpen(true);
  }

  function descargarExcel() {
    exportToExcel(
      visibles.map((e) => ({
        Fecha: formatDate(e.fecha),
        Rubro: FARM_RUBROS_EGRESO[e.rubro].label,
        Concepto: e.concepto,
        Categoría: e.categoria ?? "",
        Proveedor: nombreProveedor(e),
        "Medio de pago": MEDIOS_PAGO[e.medio_pago],
        Vencimiento: e.vencimiento ? formatDate(e.vencimiento) : "",
        Estado: e.pagado ? "Pagado" : "Pendiente",
        Monto: Number(e.monto),
        Nota: e.nota ?? "",
      })),
      "egresos-farmacia",
      "Egresos",
    );
  }

  async function handleDelete() {
    if (!aBorrar) return;
    const result = await deleteEgreso(aBorrar.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Egreso eliminado");
    setABorrar(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los rubros</SelectItem>
            {Object.entries(FARM_RUBROS_EGRESO).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" onClick={descargarExcel} disabled={visibles.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button onClick={abrirNuevo}>
            <Plus className="h-4 w-4" />
            Nuevo egreso
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Total {filtro === TODOS ? "de egresos" : FARM_RUBROS_EGRESO[filtro as FarmRubroEgreso].label.toLowerCase()}
            </p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(total)}</p>
            <p className="text-xs text-muted-foreground">
              {visibles.length} {visibles.length === 1 ? "movimiento" : "movimientos"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Pendiente de pago</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(pendiente)}</p>
            <p className="text-xs text-muted-foreground">Ya impacta en el resultado del mes</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Fecha</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Rubro</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Sin egresos cargados en este mes.
                </TableCell>
              </TableRow>
            ) : (
              visibles.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{formatDate(e.fecha)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{e.concepto}</div>
                    {e.categoria && (
                      <div className="text-xs text-muted-foreground">{e.categoria}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {FARM_RUBROS_EGRESO[e.rubro].label}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{nombreProveedor(e)}</TableCell>
                  <TableCell>
                    {e.pagado ? (
                      <span className="text-xs text-muted-foreground">
                        {MEDIOS_PAGO[e.medio_pago]}
                      </span>
                    ) : (
                      <Badge className="border-amber-200 bg-amber-100 text-amber-800">
                        Pendiente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(e.monto)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEnEdicion(e);
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
                        onClick={() => setABorrar(e)}
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

      <EgresoFormDialog
        open={open}
        onOpenChange={setOpen}
        proveedores={proveedores}
        fechaDefault={fechaDefault}
        rubroDefault={filtro === TODOS ? "variable" : (filtro as FarmRubroEgreso)}
        egreso={enEdicion}
      />

      <ConfirmDialog
        open={aBorrar !== null}
        onOpenChange={(o) => !o && setABorrar(null)}
        title="Eliminar egreso"
        description={
          aBorrar ? `Se eliminará "${aBorrar.concepto}" (${formatCurrency(aBorrar.monto)}).` : undefined
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
