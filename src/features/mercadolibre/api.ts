import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cliente mínimo de la API de Mercado Libre (Argentina).
 * Credenciales de la aplicación en variables de entorno de servidor:
 *   ML_CLIENT_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI (opcional).
 */
const API = "https://api.mercadolibre.com";
const AUTH = "https://auth.mercadolibre.com.ar/authorization";

export function mlConfigurado(): boolean {
  return Boolean(process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET);
}

function creds() {
  const id = process.env.ML_CLIENT_ID;
  const secret = process.env.ML_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Faltan ML_CLIENT_ID / ML_CLIENT_SECRET");
  return { id, secret };
}

export function redirectUri(origin: string): string {
  return process.env.ML_REDIRECT_URI ?? `${origin}/api/mercadolibre/callback`;
}

// --- state firmado (evita que alguien vincule una cuenta a otra unidad) -------
export function firmarState(unidadId: string): string {
  const payload = Buffer.from(JSON.stringify({ u: unidadId, t: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", creds().secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verificarState(state: string, maxEdadMs = 15 * 60 * 1000): string | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const esperado = createHmac("sha256", creds().secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { u, t } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u: string; t: number };
    if (Date.now() - t > maxEdadMs) return null;
    return u;
  } catch {
    return null;
  }
}

export function urlAutorizacion(origin: string, state: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: creds().id,
    redirect_uri: redirectUri(origin),
    state,
  });
  return `${AUTH}?${p}`;
}

// --- OAuth --------------------------------------------------------------------
export type MlToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
};

async function pedirToken(params: Record<string, string>): Promise<MlToken> {
  const { id, secret } = creds();
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, ...params }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Mercado Libre OAuth ${res.status}: ${data?.message ?? JSON.stringify(data)}`);
  return data as MlToken;
}

export function canjearCodigo(code: string, origin: string) {
  return pedirToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri(origin) });
}

export function refrescarToken(refreshToken: string) {
  return pedirToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

// --- Lectura ------------------------------------------------------------------
export async function mlGet<T>(path: string, token: string, extraHeaders: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json", ...extraHeaders },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Mercado Libre GET ${path} → ${res.status}: ${data?.message ?? ""}`);
  return data as T;
}

export type MlOrder = {
  id: number;
  status: string; // paid | confirmed | payment_required | cancelled | ...
  date_created: string;
  date_closed: string | null;
  total_amount: number;
  buyer?: { nickname?: string; first_name?: string; last_name?: string };
  order_items: {
    item: { id: string; title: string; seller_sku?: string | null; seller_custom_field?: string | null };
    quantity: number;
    unit_price: number;
    sale_fee?: number | null;
  }[];
  shipping?: { id?: number | null } | null;
};

/** Costo del envío que paga el vendedor (0 si no aplica o no se puede leer). */
export async function costoEnvioVendedor(shippingId: number, token: string): Promise<number> {
  try {
    const c = await mlGet<{ senders?: { cost?: number }[] }>(`/shipments/${shippingId}/costs`, token, {
      "x-format-new": "true",
    });
    return Number(c.senders?.[0]?.cost ?? 0) || 0;
  } catch {
    return 0;
  }
}
