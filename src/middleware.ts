import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Rutas que llaman servicios externos sin sesión (tienen su propia verificación). */
const RUTAS_PUBLICAS = ["/api/mercadolibre/webhook", "/api/mercadolibre/sync"];

export async function middleware(request: NextRequest) {
  if (RUTAS_PUBLICAS.some((r) => request.nextUrl.pathname.startsWith(r))) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto assets estáticos y de imagen.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
