import { z } from "zod";

export const puntoVentaSchema = z.object({
  numero: z.coerce
    .number()
    .int("El número debe ser entero")
    .min(1, "El número debe ser 1 o mayor")
    .max(99999),
  nombre: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type PuntoVentaFormValues = {
  numero: string;
  nombre: string;
};
