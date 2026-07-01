import { z } from "zod";

const CONDICIONES = [
  "responsable_inscripto",
  "monotributo",
  "consumidor_final",
  "exento",
] as const;

// Campo de texto opcional que normaliza "" -> undefined
const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const clienteSchema = z.object({
  razon_social: z
    .string()
    .trim()
    .min(1, "La razón social es obligatoria")
    .max(200),
  nombre_contacto: optionalText,
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  telefono: optionalText,
  condicion_fiscal: z.enum(CONDICIONES, {
    required_error: "Elegí una condición fiscal",
  }),
  cuit: optionalText,
  direccion: optionalText,
  notas: optionalText,
});

export type ClienteFormValues = z.infer<typeof clienteSchema>;

export const clienteDefaults: ClienteFormValues = {
  razon_social: "",
  nombre_contacto: undefined,
  email: undefined,
  telefono: undefined,
  condicion_fiscal: "consumidor_final",
  cuit: undefined,
  direccion: undefined,
  notas: undefined,
};
