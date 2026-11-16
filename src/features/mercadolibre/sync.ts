import { createAdminClient } from "@/lib/supabase/admin";
import { costoEnvioVendedor, mlGet, refrescarToken, type MlOrder } from "./api";

type Admin = ReturnType<typeof createAdminClient>;

export type Conexion = {
  unidad_id: string;
  ml_user_id: number;
  nickname: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  conectado_at: string;
};

/** Estados de orden de ML que significan venta cobrada. */
const COBRADA = new Set(["paid", "confirmed"]);

/** Devuelve un access token vigente; si vence en < 5 min lo renueva y lo guarda. */
export async function tokenVigente(db: Admin, c: Conexion): Promise<string> {
  if (new Date(c.expires_at).getTime() - Date.now() > 5 * 60 * 1000) return c.access_token;
  const t = await refrescarToken(c.refresh_token);
  const expires_at = new Date(Date.now() + t.expires_in * 1000).toISOString();
  const { error } = await db
    .from("ml_conexiones")
    .update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at, updated_at: new Date().toISOString() })
    .eq("unidad_id", c.unidad_id);
  if (error) throw new Error(error.message);
  c.access_token = t.access_token;
  c.refresh_token = t.refresh_token;
  c.expires_at = expires_at;
  return t.access_token;
}

/** Arma la venta normalizada que recibe ml_importar_venta(). */
async function normalizar(order: MlOrder, token: string) {
  const b = order.buyer ?? {};
  const nombre = [b.first_name, b.last_name].filter(Boolean).join(" ");
  const envio = order.shipping?.id ? await costoEnvioVendedor(order.shipping.id, token) : 0;
  return {
    order_id: order.id,
    fecha: order.date_closed ?? order.date_created,
    comprador: [b.nickname, nombre ? `(${nombre})` : ""].filter(Boolean).join(" "),
    items: order.order_items.map((it) => ({
      sku: it.item.seller_sku ?? it.item.seller_custom_field ?? "",
      titulo: it.item.title,
      cantidad: it.quantity,
      precio: it.unit_price,
      comision: Math.round(Number(it.sale_fee ?? 0) * it.quantity * 100) / 100,
    })),
    envio_costo: envio,
  };
}

export type ResultadoImport = { orden: number; estado: "importada" | "duplicada" | "pendiente" | "error"; detalle?: string; numero?: number };

/** Trae una orden de ML y la carga si está cobrada. Idempotente. */
export async function importarOrden(db: Admin, c: Conexion, orderId: number): Promise<ResultadoImport> {
  try {
    const token = await tokenVigente(db, c);
    const order = await mlGet<MlOrder>(`/orders/${orderId}`, token);
    if (!COBRADA.has(order.status)) {
      return { orden: orderId, estado: "pendiente", detalle: `Orden en estado "${order.status}"` };
    }
    // Solo ventas posteriores a la conexión: las anteriores se cargaron a mano.
    const fecha = new Date(order.date_closed ?? order.date_created).getTime();
    if (fecha < new Date(c.conectado_at).getTime()) {
      return { orden: orderId, estado: "pendiente", detalle: "Venta anterior a la conexión: no se importa" };
    }
    const venta = await normalizar(order, token);
    const { data, error } = await db.rpc("ml_importar_venta", { p_unidad: c.unidad_id, p_venta: venta });
    if (error) throw new Error(error.message);
    const r = data as { estado: "importada" | "duplicada"; numero?: number };
    return { orden: orderId, estado: r.estado, numero: r.numero };
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    await db.from("ml_ventas").upsert(
      { unidad_id: c.unidad_id, ml_order_id: orderId, estado: "error", detalle },
      { onConflict: "unidad_id,ml_order_id", ignoreDuplicates: false },
    );
    return { orden: orderId, estado: "error", detalle };
  }
}

/**
 * Revisa las ventas cobradas recientes de una cuenta y carga las que falten
 * (respaldo por si se pierde algún aviso de ML).
 */
export async function sincronizarConexion(db: Admin, c: Conexion, dias = 7): Promise<ResultadoImport[]> {
  const token = await tokenVigente(db, c);
  const desdeMs = Math.max(Date.now() - dias * 86400000, new Date(c.conectado_at).getTime());
  const desde = new Date(desdeMs).toISOString();
  const { data: ya } = await db.from("ml_ventas").select("ml_order_id").eq("unidad_id", c.unidad_id).eq("estado", "importada");
  const importadas = new Set((ya ?? []).map((v) => Number(v.ml_order_id)));

  const out: ResultadoImport[] = [];
  for (let offset = 0; offset < 500; offset += 50) {
    const q = new URLSearchParams({
      seller: String(c.ml_user_id),
      "order.date_created.from": desde,
      sort: "date_desc",
      limit: "50",
      offset: String(offset),
    });
    const res = await mlGet<{ results: MlOrder[]; paging: { total: number } }>(`/orders/search?${q}`, token);
    for (const o of res.results) {
      if (importadas.has(o.id) || !COBRADA.has(o.status)) continue;
      out.push(await importarOrden(db, c, o.id));
    }
    if (offset + 50 >= res.paging.total) break;
  }
  return out;
}

export async function conexionPorUnidad(db: Admin, unidadId: string): Promise<Conexion | null> {
  const { data } = await db.from("ml_conexiones").select("*").eq("unidad_id", unidadId).maybeSingle();
  return (data as Conexion | null) ?? null;
}
