import { z } from "zod";

export const vendedorSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre del vendedor").max(150),
  comision_porcentaje: z.coerce
    .number()
    .min(0, "No puede ser negativo")
    .max(100, "No puede superar 100%")
    .default(3),
});

export type VendedorFormValues = {
  nombre: string;
  comision_porcentaje: string;
};
