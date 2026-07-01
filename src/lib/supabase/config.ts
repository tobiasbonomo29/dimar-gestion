/**
 * Configuración compartida de Supabase.
 * Acepta el nuevo formato de key (publishable) y, como fallback, la anon key
 * clásica. Next inlinea estas variables NEXT_PUBLIC_* en el bundle al compilar.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
