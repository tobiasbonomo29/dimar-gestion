import { z } from "zod";

const MEDIOS = ["efectivo", "transferencia", "cheque", "tarjeta", "otro"] as const;

const optText = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const facturaCompraSchema = z.object({
  proveedor: z.string().trim().min(1, "Ingresá el proveedor").max(200),
  numero: optText,
  fecha: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  vencimiento: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  monto: z.coerce.number().nonnegative("El monto no puede ser negativo"),
  nota: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type FacturaCompraFormValues = {
  proveedor: string;
  numero: string;
  fecha: string;
  vencimiento: string;
  monto: string;
  nota: string;
};

export const facturaCompraDefaults: FacturaCompraFormValues = {
  proveedor: "",
  numero: "",
  fecha: new Date().toISOString().slice(0, 10),
  vencimiento: "",
  monto: "",
  nota: "",
};

export const pagoCompraSchema = z.object({
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  fecha: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  medio_pago: z.enum(MEDIOS).default("transferencia"),
  nota: optText,
});

export type PagoCompraFormValues = {
  monto: string;
  fecha: string;
  medio_pago: (typeof MEDIOS)[number];
  nota: string;
};
