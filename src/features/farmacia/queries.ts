import { createClient } from "@/lib/supabase/server";
import type {
  FarmCostoFijo,
  FarmEerr,
  FarmEgreso,
  FarmEmpleado,
  FarmIngreso,
  FarmProveedor,
  FarmRubroEgreso,
  FarmSueldo,
} from "@/types/database";

import { periodoLabel, rangoPeriodo } from "./periodo";

/**
 * Queries del módulo Farmacia. Todo trabaja sobre un PERÍODO MENSUAL
 * ('YYYY-MM'), como las planillas ("Período: Abril 2026"). RLS ya limita cada
 * consulta a la unidad del usuario logueado.
 */

export { periodoActual, periodoLabel, rangoPeriodo } from "./periodo";

const num = (v: unknown) => Number(v ?? 0) || 0;
const suma = <T>(rows: T[], pick: (r: T) => number) => rows.reduce((acc, r) => acc + pick(r), 0);

// -----------------------------------------------------------------------------
// Listados
// -----------------------------------------------------------------------------

/** Ingresos del período, del tipo pedido ('venta' u 'otro'). */
export async function getIngresos(periodo: string, tipo: "venta" | "otro"): Promise<FarmIngreso[]> {
  const { desde, hasta } = rangoPeriodo(periodo);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("farm_ingresos")
    .select("*")
    .eq("tipo", tipo)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Egresos del período (todos los rubros). */
export async function getEgresos(periodo: string): Promise<FarmEgreso[]> {
  const { desde, hasta } = rangoPeriodo(periodo);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("farm_egresos")
    .select("*")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProveedores(): Promise<FarmProveedor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("farm_proveedores")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCostosFijos(): Promise<FarmCostoFijo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("farm_costos_fijos")
    .select("*")
    .order("concepto", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEmpleados(): Promise<FarmEmpleado[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("farm_empleados")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSueldos(periodo: string): Promise<FarmSueldo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("farm_sueldos")
    .select("*")
    .eq("periodo", periodo)
    .order("empleado", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Parámetros manuales del EERR del período (null si todavía no se guardaron). */
export async function getEerrConfig(periodo: string): Promise<FarmEerr | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("farm_eerr")
    .select("*")
    .eq("periodo", periodo)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

// -----------------------------------------------------------------------------
// Estado de resultados
// -----------------------------------------------------------------------------

export type LineaEerr = {
  concepto: string;
  monto: number;
  /** Porcentaje sobre el total de ingresos (0 si no hay ingresos). */
  pctVentas: number;
  /** Línea de subtotal / resultado (se resalta en la tabla). */
  destacada?: boolean;
  /** Sangría: las líneas de detalle van indentadas bajo su encabezado. */
  detalle?: boolean;
  nota?: string;
};

export type EstadoResultadosFarmacia = {
  periodo: string;
  label: string;
  // Ingresos
  ventasNetas: number;
  ventasNetasManual: boolean;
  otrosIngresos: number;
  otrosIngresosManual: boolean;
  totalIngresos: number;
  // Costo
  cmv: number;
  cmvModo: "porcentaje" | "monto" | "mercaderia";
  utilidadBruta: number;
  // Operativos
  personal: number;
  costosFijos: number;
  gastosVariables: number;
  totalOperativos: number;
  // Resultados
  ebitda: number;
  depreciacion: number;
  ebit: number;
  intereses: number;
  resultadoAntesImpuestos: number;
  impuestos: number;
  impuestoGanancias: number;
  resultadoNeto: number;
  margenNeto: number;
  // Extras para el tablero
  lineas: LineaEerr[];
  cobrado: { efectivo: number; banco: number; obraSocial: number; total: number };
  porRubro: { rubro: FarmRubroEgreso; label: string; monto: number }[];
  egresosTotal: number;
  cantEmpleados: number;
  costoPorEmpleado: number;
};

const LABEL_RUBRO: Record<FarmRubroEgreso, string> = {
  mercaderia: "Mercadería",
  fijo: "Gastos fijos",
  variable: "Gastos variables",
  impuesto: "Impuestos",
  financiero: "Gastos financieros",
  otro: "Otros",
};

/**
 * Arma el estado de resultados del período combinando lo cargado a mano con los
 * parámetros de `farm_eerr`:
 *   - Ventas netas / otros ingresos: suma de lo cargado, salvo que el usuario
 *     haya puesto un valor manual que la pise.
 *   - CMV: % sobre ventas, monto fijo, o la mercadería realmente cargada.
 *   - Personal: costo total de los sueldos liquidados del período.
 *   - Costos fijos / variables / impuestos / financieros: egresos por rubro.
 */
export async function getEstadoResultados(periodo: string): Promise<EstadoResultadosFarmacia> {
  const [ventas, otros, egresos, sueldos, config] = await Promise.all([
    getIngresos(periodo, "venta"),
    getIngresos(periodo, "otro"),
    getEgresos(periodo),
    getSueldos(periodo),
    getEerrConfig(periodo),
  ]);

  // --- Ingresos ---
  const ventasCargadas = suma(ventas, (v) => num(v.total));
  const otrosCargados = suma(otros, (v) => num(v.total));
  const ventasNetasManual = config?.venta_neta !== null && config?.venta_neta !== undefined;
  const otrosIngresosManual = config?.otros_ingresos !== null && config?.otros_ingresos !== undefined;
  const ventasNetas = ventasNetasManual ? num(config!.venta_neta) : ventasCargadas;
  const otrosIngresos = otrosIngresosManual ? num(config!.otros_ingresos) : otrosCargados;
  const totalIngresos = ventasNetas + otrosIngresos;

  // Desglose de cómo entró la plata (sobre todos los ingresos cargados).
  const todos = [...ventas, ...otros];
  const cobrado = {
    efectivo: suma(todos, (v) => num(v.efectivo)),
    banco: suma(todos, (v) => num(v.banco)),
    obraSocial: suma(todos, (v) => num(v.obra_social)),
    total: 0,
  };
  cobrado.total = cobrado.efectivo + cobrado.banco + cobrado.obraSocial;

  // --- Egresos por rubro ---
  const porRubroMap = new Map<FarmRubroEgreso, number>();
  for (const e of egresos) {
    porRubroMap.set(e.rubro, (porRubroMap.get(e.rubro) ?? 0) + num(e.monto));
  }
  const r = (k: FarmRubroEgreso) => porRubroMap.get(k) ?? 0;

  // --- CMV ---
  const cmvModo = config?.cmv_modo ?? "porcentaje";
  const cmvPct = num(config?.cmv_porcentaje ?? 35);
  const cmv =
    cmvModo === "monto"
      ? num(config?.cmv_monto)
      : cmvModo === "mercaderia"
        ? r("mercaderia")
        : (ventasNetas * cmvPct) / 100;

  const utilidadBruta = totalIngresos - cmv;

  // --- Gastos operativos ---
  const personal = suma(sueldos, (s) => num(s.costo_total));
  const costosFijos = r("fijo");
  const gastosVariables = r("variable") + r("otro");
  const totalOperativos = personal + costosFijos + gastosVariables;

  const ebitda = utilidadBruta - totalOperativos;
  const depreciacion = num(config?.depreciacion);
  const ebit = ebitda - depreciacion;
  // Los intereses cargados como egreso se suman al parámetro manual.
  const intereses = num(config?.intereses) + r("financiero");
  const resultadoAntesImpuestos = ebit - intereses;

  // Ganancias solo si el resultado antes de impuestos es positivo.
  const gananciasPct = num(config?.ganancias_pct);
  const impuestoGanancias =
    resultadoAntesImpuestos > 0 ? (resultadoAntesImpuestos * gananciasPct) / 100 : 0;
  const impuestos = r("impuesto") + impuestoGanancias;
  const resultadoNeto = resultadoAntesImpuestos - impuestos;

  const pct = (n: number) => (totalIngresos > 0 ? n / totalIngresos : 0);

  const lineas: LineaEerr[] = [
    { concepto: "INGRESOS", monto: 0, pctVentas: 0, destacada: true },
    {
      concepto: "Ventas netas",
      monto: ventasNetas,
      pctVentas: pct(ventasNetas),
      detalle: true,
      nota: ventasNetasManual ? "Cargada a mano" : `${ventas.length} movimientos`,
    },
    {
      concepto: "Otros ingresos",
      monto: otrosIngresos,
      pctVentas: pct(otrosIngresos),
      detalle: true,
      nota: otrosIngresosManual ? "Cargados a mano" : `${otros.length} movimientos`,
    },
    { concepto: "TOTAL INGRESOS", monto: totalIngresos, pctVentas: pct(totalIngresos), destacada: true },

    { concepto: "COSTOS", monto: 0, pctVentas: 0, destacada: true },
    {
      concepto: "Costo de mercadería (CMV)",
      monto: cmv,
      pctVentas: pct(cmv),
      detalle: true,
      nota:
        cmvModo === "porcentaje"
          ? `Estimado ${cmvPct}% de ventas`
          : cmvModo === "mercaderia"
            ? "Mercadería cargada en el período"
            : "Monto cargado a mano",
    },
    { concepto: "UTILIDAD BRUTA", monto: utilidadBruta, pctVentas: pct(utilidadBruta), destacada: true },

    { concepto: "GASTOS OPERATIVOS", monto: 0, pctVentas: 0, destacada: true },
    {
      concepto: "Gastos de personal",
      monto: personal,
      pctVentas: pct(personal),
      detalle: true,
      nota: `${sueldos.length} liquidaciones`,
    },
    { concepto: "Costos fijos", monto: costosFijos, pctVentas: pct(costosFijos), detalle: true },
    { concepto: "Gastos variables", monto: gastosVariables, pctVentas: pct(gastosVariables), detalle: true },
    {
      concepto: "TOTAL GASTOS OPERATIVOS",
      monto: totalOperativos,
      pctVentas: pct(totalOperativos),
      destacada: true,
    },

    {
      concepto: "EBITDA",
      monto: ebitda,
      pctVentas: pct(ebitda),
      destacada: true,
      nota: "Resultado antes de intereses, impuestos, depreciación y amortización",
    },
    {
      concepto: "Depreciación y amortización",
      monto: depreciacion,
      pctVentas: pct(depreciacion),
      detalle: true,
    },
    { concepto: "EBIT (resultado operativo)", monto: ebit, pctVentas: pct(ebit), destacada: true },
    { concepto: "Intereses financieros", monto: intereses, pctVentas: pct(intereses), detalle: true },
    {
      concepto: "RESULTADO ANTES DE IMPUESTOS",
      monto: resultadoAntesImpuestos,
      pctVentas: pct(resultadoAntesImpuestos),
      destacada: true,
    },
    { concepto: "Impuestos", monto: r("impuesto"), pctVentas: pct(r("impuesto")), detalle: true },
    {
      concepto: `Impuesto a las ganancias (${gananciasPct}%)`,
      monto: impuestoGanancias,
      pctVentas: pct(impuestoGanancias),
      detalle: true,
    },
    { concepto: "RESULTADO NETO", monto: resultadoNeto, pctVentas: pct(resultadoNeto), destacada: true },
  ];

  const empleadosConSueldo = sueldos.length;

  return {
    periodo,
    label: periodoLabel(periodo),
    ventasNetas,
    ventasNetasManual,
    otrosIngresos,
    otrosIngresosManual,
    totalIngresos,
    cmv,
    cmvModo,
    utilidadBruta,
    personal,
    costosFijos,
    gastosVariables,
    totalOperativos,
    ebitda,
    depreciacion,
    ebit,
    intereses,
    resultadoAntesImpuestos,
    impuestos,
    impuestoGanancias,
    resultadoNeto,
    margenNeto: totalIngresos > 0 ? resultadoNeto / totalIngresos : 0,
    lineas,
    cobrado,
    porRubro: (Object.keys(LABEL_RUBRO) as FarmRubroEgreso[])
      .map((k) => ({ rubro: k, label: LABEL_RUBRO[k], monto: r(k) }))
      .filter((x) => x.monto > 0),
    egresosTotal: suma(egresos, (e) => num(e.monto)),
    cantEmpleados: empleadosConSueldo,
    costoPorEmpleado: empleadosConSueldo > 0 ? personal / empleadosConSueldo : 0,
  };
}

/**
 * Evolución de los últimos N meses (cerrados hacia atrás desde `periodo`) para
 * el gráfico del tablero. Una sola consulta por tabla en vez de N.
 */
export type MesFarmacia = {
  periodo: string;
  label: string;
  ingresos: number;
  egresos: number;
  resultado: number;
};

export async function getEvolucion(periodo: string, meses = 6): Promise<MesFarmacia[]> {
  const [y, m] = periodo.split("-").map(Number);
  const inicio = new Date(y, m - 1 - (meses - 1), 1);
  const desde = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-01`;
  const { hasta } = rangoPeriodo(periodo);

  const supabase = await createClient();
  const [ingRes, egrRes, sueRes] = await Promise.all([
    supabase.from("farm_ingresos").select("fecha, total").gte("fecha", desde).lte("fecha", hasta),
    supabase.from("farm_egresos").select("fecha, monto").gte("fecha", desde).lte("fecha", hasta),
    supabase.from("farm_sueldos").select("periodo, costo_total"),
  ]);
  if (ingRes.error) throw new Error(ingRes.error.message);
  if (egrRes.error) throw new Error(egrRes.error.message);
  if (sueRes.error) throw new Error(sueRes.error.message);

  const buckets = new Map<string, MesFarmacia>();
  for (let i = 0; i < meses; i++) {
    const d = new Date(y, m - 1 - (meses - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { periodo: key, label: periodoLabel(key), ingresos: 0, egresos: 0, resultado: 0 });
  }
  const at = (fecha: string) => buckets.get(fecha.slice(0, 7));

  for (const row of ingRes.data ?? []) at(row.fecha)!.ingresos += num(row.total);
  for (const row of egrRes.data ?? []) at(row.fecha)!.egresos += num(row.monto);
  // Los sueldos se imputan por período, no por fecha de pago.
  for (const row of sueRes.data ?? []) {
    const b = buckets.get(row.periodo);
    if (b) b.egresos += num(row.costo_total);
  }
  for (const b of buckets.values()) b.resultado = b.ingresos - b.egresos;

  return [...buckets.values()];
}
