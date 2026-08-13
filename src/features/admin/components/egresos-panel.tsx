"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MEDIOS_PAGO, TIPOS_EGRESO, ORIGENES_FONDOS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { exportToExcel } from "@/lib/export-excel";
import { cn } from "@/lib/utils";
import type { Egreso, TipoEgreso } from "@/types/database";

type OrigenFiltro = keyof typeof ORIGENES_FONDOS | "todos";
import { EgresoFormDialog } from "./egreso-form-dialog";
import { deleteEgreso } from "../actions";

export function EgresosPanel({ egresos, tipo }: { egresos: Egreso[]; tipo: TipoEgreso }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Egreso | null>(null);
  const [aBorrar, setABorrar] = React.useState<Egreso | null>(null);
  const [origenFiltro, setOrigenFiltro] = React.useState<OrigenFiltro>("todos");

  const filtrados = React.useMemo(
    () => (origenFiltro === "todos" ? egresos : egresos.filter((e) => e.origen === origenFiltro)),
    [egresos, origenFiltro],
  );

  const total = filtrados.reduce((a, e) => a + Number(e.monto), 0);
  const esCompra = tipo === "compra";

  function descargarExcel() {
    exportToExcel(
      egresos.map((e) => ({
        Fecha: formatDate(e.fecha),
        Concepto: e.concepto,
        Categoría: e.categoria ?? "",
        [esCompra ? "Proveedor" : "Destinatario"]: e.proveedor ?? "",
        Origen:
          e.origen && e.origen in ORIGENES_FONDOS
            ? ORIGENES_FONDOS[e.origen as keyof typeof ORIGENES_FONDOS]
            : "",
        Medio: MEDIOS_PAGO[e.medio_pago],
        Monto: Number(e.monto),
      })),
      esCompra ? "compras" : "erogaciones",
      esCompra ? "Compras" : "Erogaciones",
    );
  }

  async function handleDelete() {
    if (!aBorrar) return;
    const result = await deleteEgreso(aBorrar.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${TIPOS_EGRESO[tipo]} eliminada`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {egresos.length} {egresos.length === 1 ? "registro" : "registros"} · Total{" "}
          <span className="font-medium tabular-nums text-foreground">{formatCurrency(total)}</span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={descargarExcel} disabled={egresos.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva {esCompra ? "compra" : "erogación"}
          </Button>
        </div>
      </div>

      {/* Filtro por origen del dinero */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={origenFiltro === "todos" ? "default" : "outline"}
          size="sm"
          onClick={() => setOrigenFiltro("todos")}
        >
          Todos ({egresos.length})
        </Button>
        {(Object.keys(ORIGENES_FONDOS) as (keyof typeof ORIGENES_FONDOS)[]).map((o) => {
          const count = egresos.filter((e) => e.origen === o).length;
          return (
            <Button
              key={o}
              variant={origenFiltro === o ? "default" : "outline"}
              size="sm"
              onClick={() => setOrigenFiltro(o)}
            >
              {ORIGENES_FONDOS[o]} ({count})
            </Button>
          );
        })}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Fecha</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>{esCompra ? "Proveedor" : "Destinatario"}</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Medio</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {egresos.length === 0
                    ? `Todavía no hay ${esCompra ? "compras" : "erogaciones"}. Cargá la primera.`
                    : "No hay registros con ese origen."}
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{formatDate(e.fecha)}</TableCell>
                  <TableCell className="font-medium">{e.concepto}</TableCell>
                  <TableCell className="text-muted-foreground">{e.categoria ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.proveedor ?? "—"}</TableCell>
                  <TableCell>
                    {e.origen && e.origen in ORIGENES_FONDOS ? (
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs",
                          e.origen === "banco" && "border-blue-200 bg-blue-50 text-blue-700",
                          e.origen === "efectivo" && "border-green-200 bg-green-50 text-green-700",
                          e.origen === "terceros" && "border-amber-200 bg-amber-50 text-amber-700",
                        )}
                      >
                        {ORIGENES_FONDOS[e.origen as keyof typeof ORIGENES_FONDOS]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{MEDIOS_PAGO[e.medio_pago]}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(e.monto)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditing(e);
                          setFormOpen(true);
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
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        tipo={tipo}
        egreso={editing}
      />
      <ConfirmDialog
        open={aBorrar !== null}
        onOpenChange={(open) => !open && setABorrar(null)}
        title={`Eliminar ${esCompra ? "compra" : "erogación"}`}
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
