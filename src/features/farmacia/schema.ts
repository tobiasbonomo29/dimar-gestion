import { z } from "zod";

/**
 * Validación de los formularios del módulo Farmacia. Todo se carga a mano, así
 * que los schemas son permisivos con los campos opcionales (texto vacío -> null)
 * y estrictos solo con lo que hace falta para que las cuentas cierren.
 */

const MEDIOS = ["efectivo", "transferencia", "cheque", "tarjeta", "otro"] as const;
const TIPOS_INGRESO = ["venta", "otro"] as const;
const RUBROS = ["mercaderia", "fijo", "variable", "impuesto", "financiero", "otro"] as const;
const MODOS_CMV = ["porcentaje", "monto", "mercaderia"] as const;

/** Texto opcional: "" se convierte en undefined para guardar NULL. */
const opt = (max = 300) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

/** Fecha opcional en formato YYYY-MM-DD: "" se convierte en null. */
const optFecha = z
  .string()
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

/** Monto que puede venir vacío del formulario: "" cuenta como 0. */
const montoOpcional = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? 0 : Number(v)))
  .pipe(z.number().nonnegative("Los montos no pueden ser negativos"));

const periodo = z.string().regex(/^\d{4}-\d{2}$/, "Período inválido (esperado YYYY-MM)");

// -----------------------------------------------------------------------------
// Ingresos
// -----------------------------------------------------------------------------

export const ingresoSchema = z
  .object({
    tipo: z.enum(TIPOS_INGRESO),
    fecha: optFecha,
    semana: opt(50),
    concepto: z.string().trim().min(1, "Ingresá un concepto").max(300),
    efectivo: montoOpcional,
    banco: montoOpcional,
    obra_social: montoOpcional,
    total: montoOpcional,
    nota: opt(1000),
  })
  // Si no cargó el total, se toma la suma del desglose (el caso más común).
  .transform((v) => ({
    ...v,
    total: v.total > 0 ? v.total : v.efectivo + v.banco + v.obra_social,
  }))
  .refine((v) => v.total > 0, {
    message: "Cargá un importe: el total o alguna forma de cobro",
    path: ["total"],
  });

export type IngresoFormValues = {
  tipo: (typeof TIPOS_INGRESO)[number];
  fecha: string;
  semana: string;
  concepto: string;
  efectivo: string;
  banco: string;
  obra_social: string;
  total: string;
  nota: string;
};

export function ingresoDefaults(tipo: (typeof TIPOS_INGRESO)[number]): IngresoFormValues {
  return {
    tipo,
    fecha: new Date().toISOString().slice(0, 10),
    semana: "",
    concepto: "",
    efectivo: "",
    banco: "",
    obra_social: "",
    total: "",
    nota: "",
  };
}

// -----------------------------------------------------------------------------
// Egresos
// -----------------------------------------------------------------------------

export const egresoSchema = z.object({
  rubro: z.enum(RUBROS),
  fecha: optFecha,
  semana: opt(50),
  concepto: z.string().trim().min(1, "Ingresá un concepto").max(300),
  categoria: opt(),
  proveedor_id: opt(60),
  proveedor: opt(),
  medio_pago: z.enum(MEDIOS).default("transferencia"),
  monto: z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" ? NaN : Number(v)))
    .pipe(z.number({ invalid_type_error: "Ingresá un monto" }).positive("El monto debe ser mayor a 0")),
  vencimiento: optFecha,
  pagado: z.boolean().default(true),
  nota: opt(1000),
});

export type EgresoFormValues = {
  rubro: (typeof RUBROS)[number];
  fecha: string;
  semana: string;
  concepto: string;
  categoria: string;
  proveedor_id: string;
  proveedor: string;
  medio_pago: (typeof MEDIOS)[number];
  monto: string;
  vencimiento: string;
  pagado: boolean;
  nota: string;
};

export function egresoDefaults(rubro: (typeof RUBROS)[number] = "variable"): EgresoFormValues {
  return {
    rubro,
    fecha: new Date().toISOString().slice(0, 10),
    semana: "",
    concepto: "",
    categoria: "",
    proveedor_id: "",
    proveedor: "",
    medio_pago: "transferencia",
    monto: "",
    vencimiento: "",
    pagado: true,
    nota: "",
  };
}

// -----------------------------------------------------------------------------
// Proveedores
// -----------------------------------------------------------------------------

export const proveedorSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre").max(200),
  categoria: opt(),
  contacto: opt(),
  tipo_pago: opt(100),
  telefono: opt(60),
  email: opt(200),
  cuit: opt(20),
  notas: opt(1000),
  activo: z.boolean().default(true),
});

export type ProveedorFormValues = {
  nombre: string;
  categoria: string;
  contacto: string;
  tipo_pago: string;
  telefono: string;
  email: string;
  cuit: string;
  notas: string;
  activo: boolean;
};

export function proveedorDefaults(): ProveedorFormValues {
  return {
    nombre: "",
    categoria: "",
    contacto: "",
    tipo_pago: "",
    telefono: "",
    email: "",
    cuit: "",
    notas: "",
    activo: true,
  };
}

// -----------------------------------------------------------------------------
// Costos fijos (plantilla mensual)
// -----------------------------------------------------------------------------

export const costoFijoSchema = z.object({
  concepto: z.string().trim().min(1, "Ingresá el concepto").max(200),
  proveedor: opt(),
  dia_vencimiento: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 31), {
      message: "El día de vencimiento va de 1 a 31",
    }),
  monto: montoOpcional,
  activo: z.boolean().default(true),
  nota: opt(1000),
});

export type CostoFijoFormValues = {
  concepto: string;
  proveedor: string;
  dia_vencimiento: string;
  monto: string;
  activo: boolean;
  nota: string;
};

export function costoFijoDefaults(): CostoFijoFormValues {
  return { concepto: "", proveedor: "", dia_vencimiento: "", monto: "", activo: true, nota: "" };
}

// -----------------------------------------------------------------------------
// Empleados y sueldos
// -----------------------------------------------------------------------------

export const empleadoSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre").max(200),
  puesto: opt(100),
  fecha_ingreso: optFecha,
  sueldo_bruto: montoOpcional,
  cargas_pct: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? 0 : Number(v)))
    .pipe(z.number().min(0, "Las cargas no pueden ser negativas").max(100, "Máximo 100%")),
  activo: z.boolean().default(true),
  nota: opt(1000),
});

export type EmpleadoFormValues = {
  nombre: string;
  puesto: string;
  fecha_ingreso: string;
  sueldo_bruto: string;
  cargas_pct: string;
  activo: boolean;
  nota: string;
};

export function empleadoDefaults(): EmpleadoFormValues {
  return {
    nombre: "",
    puesto: "",
    fecha_ingreso: "",
    sueldo_bruto: "",
    cargas_pct: "23",
    activo: true,
    nota: "",
  };
}

export const sueldoSchema = z.object({
  periodo,
  empleado_id: opt(60),
  empleado: z.string().trim().min(1, "Ingresá el empleado").max(200),
  puesto: opt(100),
  sueldo_bruto: montoOpcional,
  cargas_pct: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? 0 : Number(v)))
    .pipe(z.number().min(0).max(100)),
  pagado: z.boolean().default(false),
  nota: opt(1000),
});

export type SueldoFormValues = {
  periodo: string;
  empleado_id: string;
  empleado: string;
  puesto: string;
  sueldo_bruto: string;
  cargas_pct: string;
  pagado: boolean;
  nota: string;
};

export function sueldoDefaults(periodoActual: string): SueldoFormValues {
  return {
    periodo: periodoActual,
    empleado_id: "",
    empleado: "",
    puesto: "",
    sueldo_bruto: "",
    cargas_pct: "23",
    pagado: false,
    nota: "",
  };
}

// -----------------------------------------------------------------------------
// Parámetros del estado de resultados
// -----------------------------------------------------------------------------

/** Monto que puede quedar vacío a propósito (NULL = "calculalo vos"). */
const montoNullable = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === "" || v === undefined || v === null ? null : Number(v)))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), {
    message: "Ingresá un monto válido",
  });

export const eerrSchema = z.object({
  periodo,
  venta_neta: montoNullable,
  otros_ingresos: montoNullable,
  cmv_modo: z.enum(MODOS_CMV).default("porcentaje"),
  cmv_porcentaje: montoOpcional,
  cmv_monto: montoOpcional,
  depreciacion: montoOpcional,
  intereses: montoOpcional,
  ganancias_pct: montoOpcional,
  nota: opt(1000),
});

export type EerrFormValues = {
  periodo: string;
  venta_neta: string;
  otros_ingresos: string;
  cmv_modo: (typeof MODOS_CMV)[number];
  cmv_porcentaje: string;
  cmv_monto: string;
  depreciacion: string;
  intereses: string;
  ganancias_pct: string;
  nota: string;
};
