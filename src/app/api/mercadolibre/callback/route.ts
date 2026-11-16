import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canjearCodigo, mlGet, verificarState } from "@/features/mercadolibre/api";

export const dynamic = "force-dynamic";

/** Vuelta de Mercado Libre: canjea el código por tokens y guarda la conexión. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const fail = (motivo: string) => NextResponse.redirect(`${origin}/mercadolibre?error=${encodeURIComponent(motivo)}`);

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) return fail("autorizacion");

  const unidadId = verificarState(state);
  if (!unidadId) return fail("state");

  // El usuario logueado tiene que pertenecer a la unidad que inició la vinculación.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);
  const { data: perfil } = await supabase.from("perfiles").select("unidad_id").eq("user_id", user.id).maybeSingle();
  if (perfil?.unidad_id !== unidadId) return fail("unidad");

  try {
    const t = await canjearCodigo(code, origin);
    const me = await mlGet<{ id: number; nickname: string }>("/users/me", t.access_token);
    const db = createAdminClient();

    // La misma cuenta de ML no puede quedar vinculada a dos unidades.
    const { data: otra } = await db.from("ml_conexiones").select("unidad_id").eq("ml_user_id", me.id).maybeSingle();
    if (otra && otra.unidad_id !== unidadId) return fail("cuenta_en_otra_unidad");

    const ahora = new Date().toISOString();
    const { error } = await db.from("ml_conexiones").upsert(
      {
        unidad_id: unidadId,
        ml_user_id: me.id,
        nickname: me.nickname,
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
        conectado_at: ahora,
        updated_at: ahora,
      },
      { onConflict: "unidad_id" },
    );
    if (error) throw new Error(error.message);
    return NextResponse.redirect(`${origin}/mercadolibre?ok=1`);
  } catch (err) {
    console.error("ML callback", err);
    return fail("token");
  }
}
