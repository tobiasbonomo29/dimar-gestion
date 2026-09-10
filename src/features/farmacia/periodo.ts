/**
 * Helpers de período mensual ('YYYY-MM') del módulo Farmacia.
 * Sin dependencias de servidor: los usan tanto las queries como los componentes
 * cliente (selector de mes, formularios).
 */

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Período actual en formato 'YYYY-MM'. */
export function periodoActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** true si el string tiene forma de período válido. */
export function esPeriodoValido(periodo: string | undefined): periodo is string {
  return typeof periodo === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodo);
}

/** 'YYYY-MM' -> "Abril 2026". */
export function periodoLabel(periodo: string): string {
  const [y, m] = periodo.split("-");
  const nombre = MESES[Number(m) - 1] ?? "";
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`;
}

/** Primer y último día del período (ambos inclusive, en ISO). */
export function rangoPeriodo(periodo: string): { desde: string; hasta: string } {
  const [y, m] = periodo.split("-").map(Number);
  const ultimoDia = new Date(y, m, 0).getDate(); // día 0 del mes siguiente
  return {
    desde: `${periodo}-01`,
    hasta: `${periodo}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

/** Corre el período N meses (negativo = hacia atrás). */
export function moverPeriodo(periodo: string, meses: number): string {
  const [y, m] = periodo.split("-").map(Number);
  const d = new Date(y, m - 1 + meses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
