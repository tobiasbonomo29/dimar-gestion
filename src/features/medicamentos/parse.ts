// Utilidades de parsing del archivo de Alfabeta (cliente). Genérico para TXT
// delimitado (tab / ; / | / ,). Cuando llegue el diseño de registro exacto de
// MF.Dat se puede afinar (por ej. ancho fijo) sin tocar el resto.

const DELIMS = ["\t", ";", "|", ","] as const;

/** Detecta el delimitador más probable mirando las primeras líneas con datos. */
export function detectarDelimitador(lineas: string[]): string {
  const muestra = lineas.slice(0, 10).filter((l) => l.trim());
  let mejor = "\t";
  let mejorScore = -1;
  for (const d of DELIMS) {
    const counts = muestra.map((l) => l.split(d).length - 1);
    const total = counts.reduce((a, b) => a + b, 0);
    if (total > mejorScore) {
      mejorScore = total;
      mejor = d;
    }
  }
  return mejorScore > 0 ? mejor : "\t";
}

export type ArchivoParseado = {
  delimitador: string;
  filas: string[][]; // todas las filas (incluida la posible cabecera)
  columnas: number; // cantidad de columnas detectada (máx)
};

export function parsearArchivo(texto: string): ArchivoParseado {
  const lineas = texto
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.length > 0);
  const delimitador = detectarDelimitador(lineas);
  const filas = lineas.map((l) => l.split(delimitador).map((c) => c.trim()));
  const columnas = filas.reduce((m, f) => Math.max(m, f.length), 0);
  return { delimitador, filas, columnas };
}

/** Parsea un número en formato argentino ("1.234,56") o común ("1234.56"). */
export function parseNumeroAr(s: string | undefined): number {
  if (!s) return 0;
  let t = s.replace(/[^\d.,-]/g, "").trim();
  if (t.includes(".") && t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

// Campos que se pueden mapear desde el archivo.
export const CAMPOS = [
  { key: "nro_registro", label: "Nº de registro *", req: true },
  { key: "descripcion", label: "Descripción *", req: true },
  { key: "precio", label: "Precio *", req: true },
  { key: "droga", label: "Droga / monodroga", req: false },
  { key: "laboratorio", label: "Laboratorio", req: false },
  { key: "presentacion", label: "Presentación", req: false },
  { key: "codigo_barras", label: "Código de barras / EAN", req: false },
  { key: "troquel", label: "Troquel", req: false },
] as const;

export type CampoKey = (typeof CAMPOS)[number]["key"];

/** Adivina el mapeo columna→campo a partir de los nombres de la cabecera. */
export function adivinarMapeo(cabecera: string[]): Record<CampoKey, number> {
  const mapeo = {
    nro_registro: -1, descripcion: -1, precio: -1, droga: -1,
    laboratorio: -1, presentacion: -1, codigo_barras: -1, troquel: -1,
  } as Record<CampoKey, number>;

  cabecera.forEach((raw, i) => {
    const h = raw.toLowerCase();
    if (mapeo.nro_registro < 0 && /regist/.test(h)) mapeo.nro_registro = i;
    else if (mapeo.precio < 0 && /precio|pvp|p\.?v\.?p|publico/.test(h)) mapeo.precio = i;
    else if (mapeo.descripcion < 0 && /descrip|producto|nombre|especialidad/.test(h)) mapeo.descripcion = i;
    else if (mapeo.droga < 0 && /droga|monodroga|principio/.test(h)) mapeo.droga = i;
    else if (mapeo.laboratorio < 0 && /laborat|lab\b/.test(h)) mapeo.laboratorio = i;
    else if (mapeo.presentacion < 0 && /present/.test(h)) mapeo.presentacion = i;
    else if (mapeo.codigo_barras < 0 && /barra|ean|gtin|codigo.?barra/.test(h)) mapeo.codigo_barras = i;
    else if (mapeo.troquel < 0 && /troquel/.test(h)) mapeo.troquel = i;
  });
  return mapeo;
}
