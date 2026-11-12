import { z } from "zod";
import type { CondicionPago } from "@/lib/condicion-pago";

const MEDIOS = ["efectivo", "transferencia", "cheque", "tarjeta", "otro"] as const;

const optText = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v === "" ? undefined : v));

// --- Insumo ---
export const insumoSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre").max(200),
  presentacion: optText,
  unidad_medida: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : "unidad")),
  categoria: optText,
  stock: z.coerce.number().min(0).default(0),
  stock_minimo: z.coerce.number().min(0).default(0),
});

export type InsumoFormValues = {
  nombre: string;
  presentacion: string;
  unidad_medida: string;
  categoria: string;
  stock: string;
  stock_minimo: string;
};

export const insumoDefaults: InsumoFormValues = {
  nombre: "",
  presentacion: "",
  unidad_medida: "unidad",
  categoria: "",
  stock: "0",
  stock_minimo: "0",
};

// --- Compra ---
export const compraItemSchema = z.object({
  insumo_id: z.string().uuid().nullable().optional(),
  descripcion: z.string().trim().min(1, "El ítem necesita una descripción").max(300),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  precio_unitario: z.coerce.number().nonnegative("El precio no puede ser negativo"),
});

const CONDICIONES = ["contado", "contra_entrega", "dias", "fecha"] as const;

export const compraSchema = z.object({
  fecha: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  proveedor: optText,
  medio_pago: z.enum(MEDIOS).default("transferencia"),
  condicion_pago: z.enum(CONDICIONES).default("contado"),
  // Plazo en días; solo se usa con condicion_pago = "dias".
  dias_pago: z
    .union([z.coerce.number().int().min(0, "El plazo no puede ser negativo"), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : (v as number | null))),
  // Vencimiento cargado a mano; solo se usa con condicion_pago = "fecha".
  vencimiento: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  nota: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  items: z.array(compraItemSchema).min(1, "Agregá al menos un ítem a la compra"),
});

export type CompraItemFormValues = {
  insumo_id: string | null;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
};

export type CompraFormValues = {
  fecha: string;
  proveedor: string;
  medio_pago: (typeof MEDIOS)[number];
  condicion_pago: CondicionPago;
  dias_pago: string;
  vencimiento: string;
  nota: string;
  items: CompraItemFormValues[];
};

export const compraItemDefaults: CompraItemFormValues = {
  insumo_id: null,
  descripcion: "",
  cantidad: "1",
  precio_unitario: "0",
};

export const compraDefaults: CompraFormValues = {
  fecha: new Date().toISOString().slice(0, 10),
  proveedor: "",
  medio_pago: "transferencia",
  condicion_pago: "contado",
  dias_pago: "",
  vencimiento: "",
  nota: "",
  items: [],
};
