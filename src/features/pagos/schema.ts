import { z } from "zod";

const MEDIOS = ["efectivo", "transferencia", "cheque", "tarjeta", "otro"] as const;

export const pagoSchema = z.object({
  cliente_id: z.string().uuid(),
  pedido_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  medio_pago: z.enum(MEDIOS, { required_error: "Elegí un medio de pago" }),
  nota: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type PagoFormValues = z.infer<typeof pagoSchema>;

export function pagoDefaults(clienteId: string): PagoFormValues {
  return {
    cliente_id: clienteId,
    pedido_id: undefined,
    monto: 0,
    fecha: new Date().toISOString().slice(0, 10),
    medio_pago: "transferencia",
    nota: undefined,
  };
}
