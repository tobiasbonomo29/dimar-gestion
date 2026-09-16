/**
 * Cálculo de bultos para facturas y remitos.
 *
 * Un renglón de N unidades con X unidades por bulto ocupa ceil(N / X) bultos:
 * los completos más, si sobra algo, uno incompleto. Se informa el detalle para
 * que en el depósito sepan que el último bulto no va lleno.
 */

export type BultosRenglon = {
  /** Bultos que ocupa el renglón (incluye el incompleto). */
  bultos: number;
  completos: number;
  /** Unidades sueltas que van en el bulto incompleto (0 si cierra justo). */
  sueltas: number;
};

export function calcularBultos(
  cantidad: number,
  unidadesPorBulto: number | null | undefined,
): BultosRenglon | null {
  const porBulto = Number(unidadesPorBulto);
  const cant = Number(cantidad);
  // Sin dato de empaque: no se puede calcular.
  if (!Number.isFinite(porBulto) || porBulto <= 0) return null;
  // Renglón en cero: tiene dato, simplemente no ocupa bultos.
  if (!Number.isFinite(cant) || cant <= 0) return { bultos: 0, completos: 0, sueltas: 0 };
  const completos = Math.floor(cant / porBulto);
  // Redondeo para no arrastrar decimales de punto flotante (ej. 2.9999999).
  const sueltas = Math.round((cant - completos * porBulto) * 1000) / 1000;
  return { bultos: completos + (sueltas > 0 ? 1 : 0), completos, sueltas };
}

/** Texto de la celda: "3" o "3 (2 + 5 u.)" si el último va incompleto. */
export function bultosTexto(b: BultosRenglon | null, tipo?: string | null): string {
  if (!b) return "—";
  const nombre = tipo?.trim() ? ` ${plural(tipo.trim(), b.bultos).toLowerCase()}` : "";
  if (b.sueltas === 0) return `${b.bultos}${nombre}`;
  if (b.completos === 0) return `${b.bultos}${nombre} (${b.sueltas} u.)`;
  return `${b.bultos}${nombre} (${b.completos} + ${b.sueltas} u.)`;
}

function plural(palabra: string, n: number): string {
  if (n === 1) return palabra;
  // Caja → Cajas, Bolsa → Bolsas, Pack → Packs; Cajón → Cajones, Bidón → Bidones.
  if (/[lnrdjz]$/i.test(palabra)) return `${palabra.replace(/ó(n)$/i, "o$1")}es`;
  return `${palabra}s`;
}

export type ResumenBultos = {
  total: number;
  /** Renglones cuyo último bulto no va lleno. */
  incompletos: number;
  /** Renglones sin dato de unidades por bulto: no suman al total. */
  sinDato: number;
};

export function resumirBultos(renglones: (BultosRenglon | null)[]): ResumenBultos {
  let total = 0;
  let incompletos = 0;
  let sinDato = 0;
  for (const r of renglones) {
    if (!r) {
      sinDato++;
      continue;
    }
    total += r.bultos;
    if (r.sueltas > 0) incompletos++;
  }
  return { total, incompletos, sinDato };
}

/** Leyenda del total para el pie del comprobante. */
export function resumenTexto(r: ResumenBultos): string {
  const partes = [`TOTAL BULTOS: ${r.total}`];
  if (r.incompletos > 0) {
    partes.push(`${r.incompletos} ${r.incompletos === 1 ? "incompleto" : "incompletos"}`);
  }
  if (r.sinDato > 0) {
    partes.push(
      `${r.sinDato} ${r.sinDato === 1 ? "renglón" : "renglones"} sin dato de bulto (no incluidos)`,
    );
  }
  return partes.join(" · ");
}
