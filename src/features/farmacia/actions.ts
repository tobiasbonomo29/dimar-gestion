"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/clientes/actions";
import { rangoPeriodo } from "./periodo";
import {
  costoFijoSchema,
  eerrSchema,
  egresoSchema,
  empleadoSchema,
  ingresoSchema,
  proveedorSchema,
  sueldoSchema,
  type CostoFijoFormValues,
  type EerrFormValues,
  type EgresoFormValues,
  type EmpleadoFormValues,
  type IngresoFormValues,
  type ProveedorFormValues,
  type SueldoFormValues,
} from "./schema";

/**
 * Server actions del módulo Farmacia. unidad_id lo pone el default de la DB
 * (unidad del usuario logueado) y RLS impide tocar filas de otra unidad, así
 * que las actions no lo mandan nunca.
 */

const PATH = "/farmacia";

/** Primer error legible de un safeParse fallido. */
function primerError(error: { errors: { message: string }[] }): string {
  return error.errors[0]?.message ?? "Datos inválidos";
}

function refresh() {
  revalidatePath(PATH);
}

// -----------------------------------------------------------------------------
// Ingresos
// -----------------------------------------------------------------------------

function ingresoRow(v: ReturnType<typeof ingresoSchema.parse>) {
  return {
    tipo: v.tipo,
    concepto: v.concepto,
    semana: v.semana ?? null,
    efectivo: v.efectivo,
    banco: v.banco,
    obra_social: v.obra_social,
    total: v.total,
    nota: v.nota ?? null,
    ...(v.fecha ? { fecha: v.fecha } : {}),
  };
}

export async function createIngreso(values: IngresoFormValues): Promise<ActionResult> {
  const parsed = ingresoSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_ingresos").insert(ingresoRow(parsed.data));
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true, data: undefined };
}

export async function updateIngreso(id: string, values: IngresoFormValues): Promise<ActionResult> {
  const parsed = ingresoSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_ingresos").update(ingresoRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true, data: undefined };
}

export async function deleteIngreso(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("farm_ingresos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: undefined };
}

// -----------------------------------------------------------------------------
// Egresos
// -----------------------------------------------------------------------------

function egresoRow(v: ReturnType<typeof egresoSchema.parse>) {
  return {
    rubro: v.rubro,
    concepto: v.concepto,
    semana: v.semana ?? null,
    categoria: v.categoria ?? null,
    proveedor_id: v.proveedor_id ?? null,
    proveedor: v.proveedor ?? null,
    medio_pago: v.medio_pago,
    monto: v.monto,
    vencimiento: v.vencimiento,
    pagado: v.pagado,
    nota: v.nota ?? null,
    ...(v.fecha ? { fecha: v.fecha } : {}),
  };
}

export async function createEgreso(values: EgresoFormValues): Promise<ActionResult> {
  const parsed = egresoSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_egresos").insert(egresoRow(parsed.data));
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true, data: undefined };
}

export async function updateEgreso(id: string, values: EgresoFormValues): Promise<ActionResult> {
  const parsed = egresoSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_egresos").update(egresoRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true, data: undefined };
}

export async function deleteEgreso(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("farm_egresos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: undefined };
}

// -----------------------------------------------------------------------------
// Proveedores
// -----------------------------------------------------------------------------

function proveedorRow(v: ReturnType<typeof proveedorSchema.parse>) {
  return {
    nombre: v.nombre,
    categoria: v.categoria ?? null,
    contacto: v.contacto ?? null,
    tipo_pago: v.tipo_pago ?? null,
    telefono: v.telefono ?? null,
    email: v.email ?? null,
    cuit: v.cuit ?? null,
    notas: v.notas ?? null,
    activo: v.activo,
  };
}

export async function createProveedor(values: ProveedorFormValues): Promise<ActionResult> {
  const parsed = proveedorSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_proveedores").insert(proveedorRow(parsed.data));
  if (error) {
    // Índice único por (unidad, nombre en minúsculas).
    if (error.code === "23505") return { ok: false, error: "Ya existe un proveedor con ese nombre" };
    return { ok: false, error: error.message };
  }

  refresh();
  return { ok: true, data: undefined };
}

export async function updateProveedor(id: string, values: ProveedorFormValues): Promise<ActionResult> {
  const parsed = proveedorSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_proveedores").update(proveedorRow(parsed.data)).eq("id", id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ya existe un proveedor con ese nombre" };
    return { ok: false, error: error.message };
  }

  refresh();
  return { ok: true, data: undefined };
}

export async function deleteProveedor(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("farm_proveedores").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: undefined };
}

// -----------------------------------------------------------------------------
// Costos fijos (plantilla) + generación de los egresos del mes
// -----------------------------------------------------------------------------

function costoFijoRow(v: ReturnType<typeof costoFijoSchema.parse>) {
  return {
    concepto: v.concepto,
    proveedor: v.proveedor ?? null,
    dia_vencimiento: v.dia_vencimiento,
    monto: v.monto,
    activo: v.activo,
    nota: v.nota ?? null,
  };
}

export async function createCostoFijo(values: CostoFijoFormValues): Promise<ActionResult> {
  const parsed = costoFijoSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_costos_fijos").insert(costoFijoRow(parsed.data));
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true, data: undefined };
}

export async function updateCostoFijo(id: string, values: CostoFijoFormValues): Promise<ActionResult> {
  const parsed = costoFijoSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_costos_fijos").update(costoFijoRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true, data: undefined };
}

export async function deleteCostoFijo(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("farm_costos_fijos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: undefined };
}

/**
 * Vuelca la plantilla de costos fijos activos como egresos (rubro 'fijo') del
 * período. Se saltea los conceptos que ya tienen un egreso fijo cargado ese mes
 * para que apretar el botón dos veces no duplique nada.
 */
export async function generarCostosFijos(
  periodo: string,
): Promise<ActionResult<{ creados: number; omitidos: number }>> {
  const { desde, hasta } = rangoPeriodo(periodo);
  const supabase = await createClient();

  const [plantillaRes, existentesRes] = await Promise.all([
    supabase.from("farm_costos_fijos").select("*").eq("activo", true),
    supabase
      .from("farm_egresos")
      .select("concepto")
      .eq("rubro", "fijo")
      .gte("fecha", desde)
      .lte("fecha", hasta),
  ]);
  if (plantillaRes.error) return { ok: false, error: plantillaRes.error.message };
  if (existentesRes.error) return { ok: false, error: existentesRes.error.message };

  const yaCargados = new Set((existentesRes.data ?? []).map((e) => e.concepto.trim().toLowerCase()));
  const plantilla = plantillaRes.data ?? [];
  const aCrear = plantilla.filter((c) => !yaCargados.has(c.concepto.trim().toLowerCase()));

  if (aCrear.length > 0) {
    const [, mes] = periodo.split("-").map(Number);
    const ultimoDia = Number(hasta.slice(-2));
    const { error } = await supabase.from("farm_egresos").insert(
      aCrear.map((c) => {
        // El día de vencimiento se recorta al último día del mes (ej. 31 en abril).
        const dia = Math.min(c.dia_vencimiento ?? 1, ultimoDia);
        const fecha = `${periodo}-${String(dia).padStart(2, "0")}`;
        return {
          rubro: "fijo" as const,
          fecha,
          semana: null,
          concepto: c.concepto,
          categoria: "Gastos fijos",
          proveedor_id: null,
          proveedor: c.proveedor,
          monto: Number(c.monto),
          vencimiento: c.dia_vencimiento ? fecha : null,
          pagado: false,
          nota: `Generado desde costos fijos (${String(mes).padStart(2, "0")}/${periodo.slice(0, 4)})`,
        };
      }),
    );
    if (error) return { ok: false, error: error.message };
  }

  refresh();
  return {
    ok: true,
    data: { creados: aCrear.length, omitidos: plantilla.length - aCrear.length },
  };
}

// -----------------------------------------------------------------------------
// Empleados y sueldos
// -----------------------------------------------------------------------------

function empleadoRow(v: ReturnType<typeof empleadoSchema.parse>) {
  return {
    nombre: v.nombre,
    puesto: v.puesto ?? null,
    fecha_ingreso: v.fecha_ingreso,
    sueldo_bruto: v.sueldo_bruto,
    cargas_pct: v.cargas_pct,
    activo: v.activo,
    nota: v.nota ?? null,
  };
}

export async function createEmpleado(values: EmpleadoFormValues): Promise<ActionResult> {
  const parsed = empleadoSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_empleados").insert(empleadoRow(parsed.data));
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true, data: undefined };
}

export async function updateEmpleado(id: string, values: EmpleadoFormValues): Promise<ActionResult> {
  const parsed = empleadoSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_empleados").update(empleadoRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true, data: undefined };
}

export async function deleteEmpleado(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("farm_empleados").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: undefined };
}

/** Cargas y neto derivados del bruto y el % de cargas sociales. */
function calcularSueldo(bruto: number, cargasPct: number) {
  const cargas_monto = (bruto * cargasPct) / 100;
  return { cargas_monto, sueldo_neto: Math.max(bruto - cargas_monto, 0) };
}

function sueldoRow(v: ReturnType<typeof sueldoSchema.parse>) {
  const { cargas_monto, sueldo_neto } = calcularSueldo(v.sueldo_bruto, v.cargas_pct);
  return {
    periodo: v.periodo,
    empleado_id: v.empleado_id ?? null,
    empleado: v.empleado,
    puesto: v.puesto ?? null,
    sueldo_bruto: v.sueldo_bruto,
    cargas_pct: v.cargas_pct,
    cargas_monto,
    sueldo_neto,
    pagado: v.pagado,
    nota: v.nota ?? null,
  };
}

export async function createSueldo(values: SueldoFormValues): Promise<ActionResult> {
  const parsed = sueldoSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_sueldos").insert(sueldoRow(parsed.data));
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ese empleado ya tiene una liquidación en este período" };
    }
    return { ok: false, error: error.message };
  }

  refresh();
  return { ok: true, data: undefined };
}

export async function updateSueldo(id: string, values: SueldoFormValues): Promise<ActionResult> {
  const parsed = sueldoSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("farm_sueldos").update(sueldoRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true, data: undefined };
}

export async function deleteSueldo(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("farm_sueldos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: undefined };
}

/**
 * Liquida el período con los empleados activos y su sueldo de referencia.
 * Los que ya tienen liquidación en ese período se saltean (no se pisan valores
 * que el usuario pudo haber ajustado a mano).
 */
export async function generarSueldos(
  periodo: string,
): Promise<ActionResult<{ creados: number; omitidos: number }>> {
  const supabase = await createClient();

  const [empleadosRes, existentesRes] = await Promise.all([
    supabase.from("farm_empleados").select("*").eq("activo", true),
    supabase.from("farm_sueldos").select("empleado_id").eq("periodo", periodo),
  ]);
  if (empleadosRes.error) return { ok: false, error: empleadosRes.error.message };
  if (existentesRes.error) return { ok: false, error: existentesRes.error.message };

  const yaLiquidados = new Set((existentesRes.data ?? []).map((s) => s.empleado_id));
  const empleados = empleadosRes.data ?? [];
  const aCrear = empleados.filter((e) => !yaLiquidados.has(e.id));

  if (aCrear.length > 0) {
    const { error } = await supabase.from("farm_sueldos").insert(
      aCrear.map((e) => {
        const bruto = Number(e.sueldo_bruto);
        const pct = Number(e.cargas_pct);
        return {
          periodo,
          empleado_id: e.id,
          empleado: e.nombre,
          puesto: e.puesto,
          sueldo_bruto: bruto,
          cargas_pct: pct,
          ...calcularSueldo(bruto, pct),
          pagado: false,
          nota: null,
        };
      }),
    );
    if (error) return { ok: false, error: error.message };
  }

  refresh();
  return { ok: true, data: { creados: aCrear.length, omitidos: empleados.length - aCrear.length } };
}

// -----------------------------------------------------------------------------
// Parámetros del estado de resultados
// -----------------------------------------------------------------------------

/** Guarda (o crea) los parámetros manuales del EERR del período. */
export async function guardarEerr(values: EerrFormValues): Promise<ActionResult> {
  const parsed = eerrSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: primerError(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: existente, error: readError } = await supabase
    .from("farm_eerr")
    .select("id")
    .eq("periodo", v.periodo)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };

  const row = {
    periodo: v.periodo,
    venta_neta: v.venta_neta,
    otros_ingresos: v.otros_ingresos,
    cmv_modo: v.cmv_modo,
    cmv_porcentaje: v.cmv_porcentaje,
    cmv_monto: v.cmv_monto,
    depreciacion: v.depreciacion,
    intereses: v.intereses,
    ganancias_pct: v.ganancias_pct,
    nota: v.nota ?? null,
  };

  const { error } = existente
    ? await supabase.from("farm_eerr").update(row).eq("id", existente.id)
    : await supabase.from("farm_eerr").insert(row);
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true, data: undefined };
}
