import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mlConfigurado } from "@/features/mercadolibre/api";
import { MercadoLibrePanel, type VentaML } from "@/features/mercadolibre/components/mercadolibre-panel";

export const dynamic = "force-dynamic";

export default async function MercadoLibrePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = user
    ? await supabase.from("perfiles").select("unidad_id").eq("user_id", user.id).maybeSingle()
    : { data: null };

  const configurado = mlConfigurado() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Estado de la conexión (sin tokens: solo lo que se muestra).
  let conexion: { nickname: string | null; conectado_at: string } | null = null;
  if (configurado && perfil) {
    const { data } = await createAdminClient()
      .from("ml_conexiones")
      .select("nickname, conectado_at")
      .eq("unidad_id", perfil.unidad_id)
      .maybeSingle();
    conexion = data;
  }

  const { data: ventas } = await supabase
    .from("ml_ventas")
    .select("id, ml_order_id, estado, detalle, total, comision, envio, fecha, created_at, pedido:pedidos(id, numero)")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<VentaML[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mercado Libre</h1>
        <p className="text-sm text-muted-foreground">Carga automática de las ventas de Mercado Libre.</p>
      </div>
      <MercadoLibrePanel
        configurado={configurado}
        conexion={conexion}
        ventas={ventas ?? []}
        error={error}
        ok={ok === "1"}
      />
    </div>
  );
}
