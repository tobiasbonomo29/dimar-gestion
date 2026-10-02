/**
 * Formatos del reporte gerencial. Las fechas llegan como "YYYY-MM-DD" (ya en
 * hora argentina): se formatean como texto, sin pasar por Date, para que el
 * huso horario del navegador no las corra un día.
 */
export function fechaAR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

const pctFmt = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export function pct(n: number): string {
  return `${pctFmt.format(n * 100)}%`;
}

export const ESTADO_PEDIDO_LABEL: Record<string, string> = {
  facturado: "Facturado",
  en_produccion: "En producción",
  listo_despachar: "Listo p/ despachar",
  despachado: "Despachado",
};

export function textoVencimiento(dias: number): string {
  if (dias < 0) return `Vencida hace ${-dias} ${dias === -1 ? "día" : "días"}`;
  if (dias === 0) return "Vence hoy";
  return `Vence en ${dias} ${dias === 1 ? "día" : "días"}`;
}
