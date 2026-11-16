"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/features/clientes/actions";
import { conexionPorUnidad, sincronizarConexion } from "./sync";

async function unidadActual(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("perfiles").select("unidad_id").eq("user_id", user.id).maybeSingle();
  return data?.unidad_id ?? null;
}

/** Revisa ahora las ventas cobradas de los últimos 7 días y carga las que falten. */
export async function sincronizarAhora(): Promise<ActionResult<{ importadas: number; errores: number }>> {
  const unidad = await unidadActual();
  if (!unidad) return { ok: false, error: "Sesión inválida" };
  const db = createAdminClient();
  const c = await conexionPorUnidad(db, unidad);
  if (!c) return { ok: false, error: "No hay una cuenta de Mercado Libre conectada" };
  try {
    const r = await sincronizarConexion(db, c);
    revalidatePath("/mercadolibre");
    revalidatePath("/pedidos");
    return {
      ok: true,
      data: {
        importadas: r.filter((x) => x.estado === "importada").length,
        errores: r.filter((x) => x.estado === "error").length,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo sincronizar" };
  }
}

/** Desvincula la cuenta (las ventas ya cargadas quedan). */
export async function desconectarMercadoLibre(): Promise<ActionResult> {
  const unidad = await unidadActual();
  if (!unidad) return { ok: false, error: "Sesión inválida" };
  const { error } = await createAdminClient().from("ml_conexiones").delete().eq("unidad_id", unidad);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/mercadolibre");
  return { ok: true, data: undefined };
}
