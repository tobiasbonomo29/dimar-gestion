import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** Cliente de Supabase para uso en componentes cliente ("use client"). */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
}
