/**
 * Condiciones de pago de compras y facturas de proveedores.
 * Compartido entre el módulo de Compras (insumos) y Cuentas a pagar, para que
 * el vencimiento se calcule igual en los dos lados.
 */

export type CondicionPago = "contado" | "contra_entrega" | "dias" | "fecha";

/** Opciones del selector. `dias` fijo evita tipear los plazos más usados. */
export const CONDICIONES_PAGO: {
  value: string;
  label: string;
  condicion: CondicionPago;
  dias?: number;
}[] = [
  { value: "contado", label: "Contado (ya pagada)", condicion: "contado" },
  { value: "contra_entrega", label: "Contra entrega", condicion: "contra_entrega" },
  { value: "15", label: "15 días", condicion: "dias", dias: 15 },
  { value: "30", label: "30 días", condicion: "dias", dias: 30 },
  { value: "60", label: "60 días", condicion: "dias", dias: 60 },
  { value: "90", label: "90 días", condicion: "dias", dias: 90 },
  { value: "dias", label: "Otro plazo (X días)", condicion: "dias" },
  { value: "fecha", label: "Fecha puntual", condicion: "fecha" },
];

/** Suma días a una fecha ISO (YYYY-MM-DD) sin pasar por zonas horarias. */
export function sumarDias(fechaIso: string, dias: number): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const fecha = new Date(y, m - 1, d + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(
    fecha.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Vencimiento resultante de la condición pactada.
 *   contado        -> null (no queda deuda)
 *   contra_entrega -> la misma fecha de la compra
 *   dias           -> fecha + dias
 *   fecha          -> la fecha cargada a mano
 */
export function calcularVencimiento(opts: {
  fecha: string;
  condicion: CondicionPago;
  dias?: number | null;
  vencimientoManual?: string | null;
}): string | null {
  const { fecha, condicion, dias, vencimientoManual } = opts;
  if (condicion === "contado") return null;
  if (condicion === "contra_entrega") return fecha;
  if (condicion === "fecha") return vencimientoManual?.trim() ? vencimientoManual : null;
  const n = Number(dias);
  if (!Number.isFinite(n) || n < 0) return null;
  return sumarDias(fecha, n);
}

/** Texto para mostrar la condición en tablas y comprobantes. */
export function condicionTexto(condicion: CondicionPago, dias?: number | null): string {
  if (condicion === "contado") return "Contado";
  if (condicion === "contra_entrega") return "Contra entrega";
  if (condicion === "dias") return dias != null ? `${dias} días` : "A plazo";
  return "Fecha puntual";
}

/** Valor del selector a partir de lo guardado (para reabrir un formulario). */
export function valorSelector(condicion: CondicionPago, dias?: number | null): string {
  if (condicion !== "dias") return condicion;
  const fijo = CONDICIONES_PAGO.find((c) => c.condicion === "dias" && c.dias === dias);
  return fijo ? fijo.value : "dias";
}
