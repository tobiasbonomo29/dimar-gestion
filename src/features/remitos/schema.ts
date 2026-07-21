import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const remitoItemSchema = z.object({
  producto_id: z.string().uuid().nullable().optional(),
  descripcion: z.string().trim().min(1, "El ítem necesita una descripción").max(300),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  unidad: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  // Precio opcional: vacío → null (el renglón no lleva importe).
  precio_unitario: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.coerce.number().nonnegative("El precio no puede ser negativo").nullable(),
  ),
});

export const remitoSchema = z.object({
  destinatario: z.string().trim().min(1, "Ingresá el destinatario").max(200),
  destinatario_direccion: optionalText,
  destinatario_cuit: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  fecha: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  notas: optionalText,
  items: z.array(remitoItemSchema).min(1, "Agregá al menos un ítem al remito"),
});

export type RemitoParsed = z.output<typeof remitoSchema>;

// --- Tipos del formulario (React Hook Form) ---
export type RemitoItemFormValues = {
  producto_id: string | null;
  descripcion: string;
  cantidad: string;
  unidad: string;
  precio_unitario: string;
};

export type RemitoFormValues = {
  destinatario: string;
  destinatario_direccion: string;
  destinatario_cuit: string;
  fecha: string;
  notas: string;
  items: RemitoItemFormValues[];
};

export const remitoItemDefaults: RemitoItemFormValues = {
  producto_id: null,
  descripcion: "",
  cantidad: "1",
  unidad: "",
  precio_unitario: "",
};

export const remitoDefaults: RemitoFormValues = {
  destinatario: "",
  destinatario_direccion: "",
  destinatario_cuit: "",
  fecha: "",
  notas: "",
  items: [],
};
