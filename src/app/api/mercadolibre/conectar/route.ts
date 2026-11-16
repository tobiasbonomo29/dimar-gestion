import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { firmarState, mlConfigurado, urlAutorizacion } from "@/features/mercadolibre/api";

export const dynamic = "force-dynamic";

/** Inicia la vinculación: manda al usuario a autorizar la app en Mercado Libre. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!mlConfigurado()) {
    return NextResponse.redirect(`${origin}/mercadolibre?error=config`);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const { data: perfil } = await supabase.from("perfiles").select("unidad_id").eq("user_id", user.id).maybeSingle();
  if (!perfil) return NextResponse.redirect(`${origin}/mercadolibre?error=unidad`);

  return NextResponse.redirect(urlAutorizacion(origin, firmarState(perfil.unidad_id)));
}
