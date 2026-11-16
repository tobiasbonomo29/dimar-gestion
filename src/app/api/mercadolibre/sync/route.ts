import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sincronizarConexion, type Conexion } from "@/features/mercadolibre/sync";
import { mlConfigurado } from "@/features/mercadolibre/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Revisión diaria (Vercel Cron): carga las ventas cobradas de los últimos días
 * que no hayan entrado por el webhook. Vercel manda Authorization: Bearer
 * CRON_SECRET; sin ese secreto la ruta no hace nada.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!mlConfigurado()) return NextResponse.json({ ok: true, omitido: "ML no configurado" });

  const db = createAdminClient();
  const { data: conexiones } = await db.from("ml_conexiones").select("*");
  const resumen: Record<string, unknown> = {};
  for (const c of (conexiones ?? []) as Conexion[]) {
    try {
      const r = await sincronizarConexion(db, c);
      resumen[c.nickname ?? c.unidad_id] = {
        importadas: r.filter((x) => x.estado === "importada").length,
        errores: r.filter((x) => x.estado === "error").length,
      };
    } catch (err) {
      resumen[c.nickname ?? c.unidad_id] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return NextResponse.json({ ok: true, resumen });
}
