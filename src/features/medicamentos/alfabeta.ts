// Cliente server-side de la API REST de Alfabeta (apimfdigital.alfabeta.net).
// Las credenciales van por header (usuario/clave) desde variables de entorno
// del servidor. NO usar en el cliente.

const BASE = "https://apimfdigital.alfabeta.net/ifarmacia";

function headers(): Record<string, string> {
  return {
    usuario: process.env.ALFABETA_USUARIO ?? "",
    clave: process.env.ALFABETA_CLAVE ?? "",
    "Accept-Encoding": "gzip",
  };
}

export type AlfabetaArticulo = {
  id: number;
  estado?: string; // A=Activo, I=Inactivo
  nombre?: string;
  presentacion?: string;
  troquel?: string;
  codigoDeBarras?: string[];
  laboratorio?: number;
  droga?: number;
  precio?: number;
};

export type Novedad = {
  orden: number;
  operacion: string; // P, A, M, R, B, T, C, D
  tabla: string;
  registro?: number;
  precio?: number;
  articulo?: AlfabetaArticulo;
};

async function get(path: string): Promise<Record<string, unknown>> {
  if (!process.env.ALFABETA_USUARIO || !process.env.ALFABETA_CLAVE) {
    throw new Error("Faltan las credenciales de Alfabeta (ALFABETA_USUARIO / ALFABETA_CLAVE).");
  }
  const res = await fetch(`${BASE}${path}`, { headers: headers(), cache: "no-store" });
  const json = (await res.json()) as Record<string, unknown>;
  const estado = json.estado as string | undefined;
  if (estado && estado !== "OK" && estado !== "SIN_NOVEDADES") {
    throw new Error(`Alfabeta respondió “${estado}”. Revisá usuario/clave o consultá a Alfabeta.`);
  }
  return json;
}

/** Tabla auxiliar (id → descripción). Ej: "laboratorios", "drogas". */
export async function getAuxMap(tabla: string): Promise<Map<number, string>> {
  const json = await get(`/${tabla}`);
  const datos = (json.datos as { id: number; descripcion: string }[]) ?? [];
  const map = new Map<number, string>();
  for (const d of datos) map.set(d.id, d.descripcion);
  return map;
}

/** Base completa (test=true trae pocos registros para probar). */
export async function getBaseCompleta(
  test: boolean,
): Promise<{ articulos: AlfabetaArticulo[]; ultimolog: number }> {
  const json = await get(`/base-completa?test=${test}`);
  return {
    articulos: (json.datos as AlfabetaArticulo[]) ?? [],
    ultimolog: Number(json.ultimolog) || 0,
  };
}

/** Novedades desde un log dado (para actualizaciones incrementales). */
export async function getNovedades(
  ultimologmf: number,
): Promise<{ sinNovedades: boolean; datos: Novedad[]; ultimolog: number }> {
  const json = await get(`/novedades?ultimologmf=${ultimologmf}`);
  const datos = (json.datos as Novedad[]) ?? [];
  const nuevoLog = datos.reduce((max, d) => Math.max(max, Number(d.orden) || 0), ultimologmf);
  return {
    sinNovedades: json.estado === "SIN_NOVEDADES",
    datos,
    ultimolog: Number(json.ultimolog) || nuevoLog,
  };
}
