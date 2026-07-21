"use client";

import * as React from "react";
import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ESTADOS_PEDIDO,
  ESTADOS_GENERAN_DEUDA,
  CONDICIONES_FISCALES,
  ORIGENES_PEDIDO,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { exportToExcel } from "@/lib/export-excel";
import type { PedidoConCliente, CobranzaPedido } from "../queries";

type ColumnaKey =
  | "numero"
  | "cliente"
  | "direccion"
  | "telefono"
  | "email"
  | "cuit"
  | "condicion_fiscal"
  | "estado"
  | "fecha_creacion"
  | "fecha_estimada_entrega"
  | "origen"
  | "total"
  | "estado_cobro"
  | "cobrado_monto"
  | "pendiente_monto"
  | "notas";

/** Estado de cobro derivado de la imputación de pagos (FIFO por cliente). */
function estadoCobro(
  p: PedidoConCliente,
  cobranza: Record<string, CobranzaPedido>,
): "Cobrado" | "Parcial" | "Pendiente" | "No facturado" {
  if (!ESTADOS_GENERAN_DEUDA.includes(p.estado)) return "No facturado";
  const c = cobranza[p.id];
  const pendiente = c?.pendiente ?? Number(p.total);
  const pagado = c?.pagado ?? 0;
  if (pendiente <= 0.01) return "Cobrado";
  if (pagado > 0.01) return "Parcial";
  return "Pendiente";
}

type Columna = {
  key: ColumnaKey;
  label: string;
  get: (p: PedidoConCliente, cobranza: Record<string, CobranzaPedido>) => string | number;
};

const COLUMNAS: Columna[] = [
  { key: "numero", label: "N° de pedido", get: (p) => p.numero },
  { key: "cliente", label: "Cliente", get: (p) => p.clientes?.razon_social ?? "" },
  { key: "direccion", label: "Dirección", get: (p) => p.clientes?.direccion ?? "" },
  { key: "telefono", label: "Teléfono", get: (p) => p.clientes?.telefono ?? "" },
  { key: "email", label: "Email", get: (p) => p.clientes?.email ?? "" },
  { key: "cuit", label: "CUIT", get: (p) => p.clientes?.cuit ?? "" },
  {
    key: "condicion_fiscal",
    label: "Condición fiscal",
    get: (p) => (p.clientes ? CONDICIONES_FISCALES[p.clientes.condicion_fiscal] : ""),
  },
  { key: "estado", label: "Estado", get: (p) => ESTADOS_PEDIDO[p.estado].label },
  { key: "fecha_creacion", label: "Fecha de creación", get: (p) => formatDate(p.fecha_creacion) },
  {
    key: "fecha_estimada_entrega",
    label: "Entrega estimada",
    get: (p) => formatDate(p.fecha_estimada_entrega),
  },
  { key: "origen", label: "Origen", get: (p) => (p.origen ? ORIGENES_PEDIDO[p.origen] : "") },
  { key: "total", label: "Total", get: (p) => Number(p.total) },
  { key: "estado_cobro", label: "Estado de cobro", get: (p, cobranza) => estadoCobro(p, cobranza) },
  {
    key: "cobrado_monto",
    label: "Cobrado",
    get: (p, cobranza) => cobranza[p.id]?.pagado ?? 0,
  },
  {
    key: "pendiente_monto",
    label: "Pendiente de cobro",
    get: (p, cobranza) =>
      ESTADOS_GENERAN_DEUDA.includes(p.estado)
        ? cobranza[p.id]?.pendiente ?? Number(p.total)
        : 0,
  },
  { key: "notas", label: "Notas", get: (p) => p.notas ?? "" },
];

const DEFAULT_SELECCION: ColumnaKey[] = [
  "numero",
  "cliente",
  "direccion",
  "telefono",
  "estado",
  "fecha_estimada_entrega",
  "total",
  "estado_cobro",
];

export function ExportarExcelDialog({
  pedidos,
  cobranza,
  nombreArchivo = "pedidos",
}: {
  pedidos: PedidoConCliente[];
  cobranza: Record<string, CobranzaPedido>;
  nombreArchivo?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [seleccion, setSeleccion] = React.useState<Set<ColumnaKey>>(new Set(DEFAULT_SELECCION));

  function toggle(key: ColumnaKey, checked: boolean) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function handleExportar() {
    const columnas = COLUMNAS.filter((c) => seleccion.has(c.key));
    const rows = pedidos.map((p) => {
      const row: Record<string, string | number> = {};
      for (const col of columnas) row[col.label] = col.get(p, cobranza);
      return row;
    });
    const fecha = new Date().toISOString().slice(0, 10);
    exportToExcel(rows, `${nombreArchivo}-${fecha}.xlsx`);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar a Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar a Excel</DialogTitle>
          <DialogDescription>
            Elegí qué columnas incluir. Se exportan los {pedidos.length} pedido
            {pedidos.length === 1 ? "" : "s"} visible{pedidos.length === 1 ? "" : "s"} con el
            filtro actual.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {COLUMNAS.map((col) => (
            <div key={col.key} className="flex items-center gap-2">
              <Switch
                id={`col-${col.key}`}
                checked={seleccion.has(col.key)}
                onCheckedChange={(checked) => toggle(col.key, checked)}
              />
              <Label htmlFor={`col-${col.key}`} className="text-sm font-normal">
                {col.label}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExportar} disabled={seleccion.size === 0 || pedidos.length === 0}>
            Descargar ({pedidos.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
