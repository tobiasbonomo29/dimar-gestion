import { z } from "zod";

const TIPOS = ["compra", "erogacion"] as const;
const MEDIOS = ["efectivo", "transferencia", "cheque", "tarjeta", "otro"] as const;

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
  nota: string;
};

export function egresoDefaults(tipo: (typeof TIPOS)[number]): EgresoFormValues {
  return {
    tipo,
    fecha: new Date().toISOString().slice(0, 10),
    concepto: "",
    proveedor: "",
    categoria: "",
    monto: "",
    medio_pago: "transferencia",
    nota: "",
  };
}
