import { NextResponse, after, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { importarOrden, type Conexion } from "@/features/mercadolibre/sync";

export const dynamic = "force-dynamic";

type Notificacion = {
  resource?: string; // "/orders/2000001234"
  user_id?: number;
  topic?: string; // "orders_v2"
  application_id?: number;
};

/**
 * Aviso de Mercado Libre (topic orders_v2). ML exige responder 200 rápido:
 * se responde enseguida y la importación corre después con after().
 * Seguridad: solo se procesan avisos de nuestra aplicación y de cuentas
 * vinculadas, y la orden se vuelve a leer de la API de ML (fuente de verdad).
 */
export async function POST(request: NextRequest) {
  const n = (await request.json().catch(() => ({}))) as Notificacion;

  const appOk = !process.env.ML_CLIENT_ID || String(n.application_id) === process.env.ML_CLIENT_ID;
  const match = n.resource?.match(/^\/orders\/(\d+)$/);
  if (n.topic === "orders_v2" && appOk && match && n.user_id) {
    const orderId = Number(match[1]);
    const mlUserId = n.user_id;
    after(async () => {
      try {
        const db = createAdminClient();
        const { data } = await db.from("ml_conexiones").select("*").eq("ml_user_id", mlUserId).maybeSingle();
        if (!data) return;
        const r = await importarOrden(db, data as Conexion, orderId);
        console.log("ML webhook", r);
      } catch (err) {
        console.error("ML webhook", err);
      }
    });
  }
  return NextResponse.json({ ok: true });
}

/** ML a veces prueba la URL con GET. */
export function GET() {
  return NextResponse.json({ ok: true });
}
