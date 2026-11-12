"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import {
  CONDICIONES_PAGO,
  calcularVencimiento,
  valorSelector,
  type CondicionPago,
} from "@/lib/condicion-pago";

export type CondicionPagoValues = {
  condicion_pago: CondicionPago;
  /** Plazo en días (string del input); solo aplica a "dias". */
  dias_pago: string;
  /** Vencimiento manual; solo aplica a "fecha". */
  vencimiento: string;
};

/**
 * Selector de condición de pago (contado / contra entrega / X días / fecha) con
 * el vencimiento resultante a la vista. Compartido entre Compras de insumos y
 * Cuentas a pagar para que el cálculo sea el mismo en los dos lados.
 */
export function CondicionPagoFields({
  fecha,
  values,
  onChange,
  ayudaContado,
}: {
  /** Fecha de la compra/factura: base del cálculo. */
  fecha: string;
  values: CondicionPagoValues;
  onChange: (values: CondicionPagoValues) => void;
  /** Texto bajo el selector cuando es contado (cambia según el módulo). */
  ayudaContado?: string;
}) {
  const { condicion_pago, dias_pago, vencimiento } = values;
  const seleccion = valorSelector(condicion_pago, dias_pago === "" ? null : Number(dias_pago));

  const base = fecha?.trim() ? fecha : new Date().toISOString().slice(0, 10);
  const vence = calcularVencimiento({
    fecha: base,
    condicion: condicion_pago,
    dias: dias_pago === "" ? null : Number(dias_pago),
    vencimientoManual: vencimiento,
  });

  function elegir(valor: string) {
    const opcion = CONDICIONES_PAGO.find((c) => c.value === valor);
    if (!opcion) return;
    onChange({
      condicion_pago: opcion.condicion,
      // Los plazos fijos (15/30/60/90) traen sus días; "Otro plazo" los pide.
      dias_pago: opcion.dias != null ? String(opcion.dias) : opcion.condicion === "dias" ? dias_pago : "",
      vencimiento: opcion.condicion === "fecha" ? vencimiento : "",
    });
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="condicion_pago">Condición de pago</Label>
      <Select value={seleccion} onValueChange={elegir}>
        <SelectTrigger id="condicion_pago">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONDICIONES_PAGO.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* "Otro plazo": los días los escribe el usuario. */}
      {seleccion === "dias" && (
        <div className="grid gap-1.5">
          <Label htmlFor="dias_pago" className="text-xs">
            Días de plazo
          </Label>
          <Input
            id="dias_pago"
            type="number"
            min="0"
            step="1"
            placeholder="Ej: 45"
            value={dias_pago}
            onChange={(e) => onChange({ ...values, dias_pago: e.target.value })}
          />
        </div>
      )}

      {condicion_pago === "fecha" && (
        <div className="grid gap-1.5">
          <Label htmlFor="vencimiento" className="text-xs">
            Vencimiento
          </Label>
          <Input
            id="vencimiento"
            type="date"
            value={vencimiento}
            onChange={(e) => onChange({ ...values, vencimiento: e.target.value })}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {condicion_pago === "contado"
          ? ayudaContado ?? "Sin deuda pendiente: no va al calendario de pagos."
          : vence
            ? `Vence el ${formatDate(vence)} · aparece en el calendario de pagos.`
            : "Elegí el vencimiento para que aparezca en el calendario."}
      </p>
    </div>
  );
}
