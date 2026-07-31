import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v === "" ? undefined : v));

// Precio opcional: acepta "" / null y lo normaliza a null (usa fallback).
const precioOpcional = z
  .union([z.coerce.number().nonnegative("El precio no puede ser negativo"), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : (v as number | null)));

export const varianteSchema = z.object({
  id: z.string().uuid().optional(), // presente = variante existente
  nombre: z.string().trim().min(1, "Ponele un nombre a la variante").max(150),
  tamano: optionalText,
  presentacion: optionalText,
  cantidad_por_bulto: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : (v as number | null))),
  precio: precioOpcional,
});

export const productoSchema = z.object({
  codigo: optionalText,
  codigo_barras: optionalText,
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  categoria: z.string().trim().min(1, "Elegí o creá una categoría").max(60),
  descripcion: optionalText,
  unidad_medida: z.string().trim().min(1).max(50).default("unidad"),
  precio_base: z.coerce.number().nonnegative("El precio base no puede ser negativo"),
  stock: z.coerce.number().default(0),
  activo: z.boolean().default(true),
  variantes: z.array(varianteSchema).default([]),
});

export type ProductoParsed = z.output<typeof productoSchema>;

// Tipos del formulario (React Hook Form): los campos numéricos se manejan como
// string en los inputs y el server los coacciona con Zod al validar.
export type VarianteFormValues = {
  id?: string;
  nombre: string;
  tamano?: string;
  presentacion?: string;
  cantidad_por_bulto?: string;
  precio?: string;
};

export type ProductoFormValues = {
  codigo?: string;
  codigo_barras?: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  unidad_medida: string;
  precio_base: string;
  stock: string;
  activo: boolean;
  variantes: VarianteFormValues[];
};

export const varianteDefaults: VarianteFormValues = {
  nombre: "",
  tamano: "",
  presentacion: "",
  cantidad_por_bulto: "",
  precio: "",
};

export const productoDefaults: ProductoFormValues = {
  codigo: "",
  codigo_barras: "",
  nombre: "",
  categoria: "",
  descripcion: "",
  unidad_medida: "unidad",
  precio_base: "0",
  stock: "0",
  activo: true,
  variantes: [],
};

// --- Actualización de precios en bloque (planilla) ---
export const bulkPreciosSchema = z.object({
  productos: z.array(
    z.object({
      id: z.string().uuid(),
      precio_base: z.coerce.number().nonnegative(),
    }),
  ),
  variantes: z.array(
    z.object({
      id: z.string().uuid(),
      precio: z
        .union([z.coerce.number().nonnegative(), z.null()])
        .transform((v) => (v === undefined ? null : v)),
    }),
  ),
});

export type BulkPreciosValues = z.infer<typeof bulkPreciosSchema>;
