import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/**
 * Cliente de Supabase para Server Components y Server Actions.
 * Lee/escribe cookies para mantener la sesión del único usuario admin.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: las cookies se refrescan
            // en el middleware, así que este error se puede ignorar.
          }
        },
      },
    },
  );
}
