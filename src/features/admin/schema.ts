import { z } from "zod";

const TIPOS = ["compra", "erogacion"] as const;
const MEDIOS = ["efectivo", "transferencia", "cheque", "tarjeta", "otro"] as const;
const ORIGENES = ["banco", "efectivo", "terceros"] as const;

const optionalText = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const egresoSchema = z.object({
  tipo: z.enum(TIPOS),
  fecha: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  concepto: z.string().trim().min(1, "Ingresá un concepto").max(300),
  proveedor: optionalText,
  categoria: optionalText,
  monto: z.coerce.number().nonnegative("El monto no puede ser negativo"),
  medio_pago: z.enum(MEDIOS).default("transferencia"),
  origen: z.enum(ORIGENES).default("banco"),
  nota: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type EgresoParsed = z.output<typeof egresoSchema>;

// --- Tipos del formulario ---
export type EgresoFormValues = {
  tipo: (typeof TIPOS)[number];
  fecha: string;
  concepto: string;
  proveedor: string;
  categoria: string;
  monto: string;
  medio_pago: (typeof MEDIOS)[number];
  origen: (typeof ORIGENES)[number];
  nota: string;
};

// --- Aportes de capital ---
const ORIGENES_APORTE = ["banco", "efectivo", "terceros"] as const;

export const aporteSchema = z.object({
  aportante: z.string().trim().min(1, "Ingresá quién hizo el aporte").max(150),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  fecha: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  origen: z.enum(ORIGENES_APORTE).default("banco"),
  nota: optionalText,
});

export type AporteFormValues = {
  aportante: string;
  monto: string;
  fecha: string;
  origen: (typeof ORIGENES_APORTE)[number];
  nota: string;
};

export function aporteDefaults(): AporteFormValues {
  return {
    aportante: "",
    monto: "",
    fecha: new Date().toISOString().slice(0, 10),
    origen: "banco",
    nota: "",
  };
}

export function egresoDefaults(tipo: (typeof TIPOS)[number]): EgresoFormValues {
  return {
    tipo,
    fecha: new Date().toISOString().slice(0, 10),
    concepto: "",
    proveedor: "",
    categoria: "",
    monto: "",
    medio_pago: "transferencia",
    origen: "banco",
    nota: "",
  };
}
