import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SUPABASE_URL } from "./config";

/**
 * Cliente con la service role key: saltea RLS. SOLO para código de servidor que
 * no tiene usuario logueado (webhooks, cron). Nunca importarlo desde un
 * componente de cliente. Requiere SUPABASE_SERVICE_ROLE_KEY (variable de
 * entorno sin NEXT_PUBLIC_, no llega al navegador).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
