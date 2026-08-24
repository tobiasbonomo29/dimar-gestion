import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas privadas:
 * si no hay usuario autenticado, redirige a /login (salvo que ya esté ahí).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // La verificación de sesión hace una llamada de red a Supabase. En el Edge de
  // Vercel, si esa llamada tarda o se cuelga, el middleware daba 504
  // (MIDDLEWARE_INVOCATION_TIMEOUT). Le ponemos un timeout: si no responde a
  // tiempo, dejamos pasar el request sin redirigir (RLS igual protege los datos).
  const getUserPromise = supabase.auth.getUser();
  const timeout = new Promise<Awaited<typeof getUserPromise>>((_, reject) =>
    setTimeout(() => reject(new Error("auth-timeout")), 4000),
  );

  let user = null;
  try {
    const { data } = await Promise.race([getUserPromise, timeout]);
    user = data.user;
  } catch {
    return supabaseResponse;
  }

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");

  // Sin sesión y fuera del login → al login.
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Con sesión y en el login → al dashboard.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
