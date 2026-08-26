import { z } from "zod";

const ORIGENES = ["email", "whatsapp", "telefono"] as const;

const optionalText = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const pedidoItemSchema = z.object({
  producto_id: z.string().uuid().nullable().optional(),
  variante_id: z.string().uuid().nullable().optional(),
  descripcion: z.string().trim().min(1, "El ítem necesita una descripción").max(300),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  precio_unitario: z.coerce.number().nonnegative("El precio no puede ser negativo"),
});

export const pedidoSchema = z.object({
  cliente_id: z.string().uuid("Elegí un cliente"),
  vendedor_id: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  origen: z
    .enum(ORIGENES)
    .or(z.literal(""))
    .nullable()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  fecha_estimada_entrega: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  descuento_porcentaje: z.coerce.number().min(0).max(100).default(0),
  iva_porcentaje: z.coerce.number().min(0).max(100).default(21),
  notas: optionalText,
  items: z.array(pedidoItemSchema).min(1, "Agregá al menos un ítem al pedido"),
});

export type PedidoParsed = z.output<typeof pedidoSchema>;

// --- Tipos del formulario (React Hook Form) ---
export type PedidoItemFormValues = {
  producto_id: string | null;
  variante_id: string | null;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
};

export type PedidoFormValues = {
  cliente_id: string;
  vendedor_id: string;
  origen: (typeof ORIGENES)[number] | "";
  fecha_estimada_entrega: string;
  descuento_porcentaje: string;
  iva_porcentaje: string;
  notas: string;
  items: PedidoItemFormValues[];
};

export const pedidoItemDefaults: PedidoItemFormValues = {
  producto_id: null,
  variante_id: null,
  descripcion: "",
  cantidad: "1",
  precio_unitario: "0",
};

export const pedidoDefaults: PedidoFormValues = {
  cliente_id: "",
  vendedor_id: "",
  origen: "",
  fecha_estimada_entrega: "",
  descuento_porcentaje: "0",
  iva_porcentaje: "21",
  notas: "",
  items: [],
};
