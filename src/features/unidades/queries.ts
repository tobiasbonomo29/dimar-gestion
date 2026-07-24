import { createClient } from "@/lib/supabase/server";
import { EMPRESA } from "@/lib/constants";

/** Datos de membrete de la unidad de negocio del usuario logueado. */
export type Empresa = {
  nombre: string;
  cuit: string;
  direccion: string;
  email: string;
  telefono: string;
};

/**
 * Devuelve el membrete de la unidad del usuario actual (para los PDF y la marca
 * de la app). Si por algún motivo no hay unidad asociada, cae a los valores por
 * defecto de EMPRESA (variables de entorno).
 */
export async function getEmpresaActual(): Promise<Empresa> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("unidades")
    .select("nombre, cuit, direccion, email, telefono")
    .maybeSingle();

  // Sin unidad asociada: membrete por defecto (variables de entorno).
  if (!data) {
    return {
      nombre: EMPRESA.nombre,
      cuit: EMPRESA.cuit,
      direccion: EMPRESA.direccion,
      email: EMPRESA.email,
      telefono: EMPRESA.telefono,
    };
  }

  // Con unidad: se usan SIEMPRE sus propios datos. Los que falten quedan
  // vacíos (no se mezclan con los de otra unidad ni con las env de Dimar).
  return {
    nombre: data.nombre?.trim() || EMPRESA.nombre,
    cuit: data.cuit ?? "",
    direccion: data.direccion ?? "",
    email: data.email ?? "",
    telefono: data.telefono ?? "",
  };
}
