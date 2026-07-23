import { createClient } from "@/lib/supabase/server";
import { ESTADOS_GENERAN_DEUDA } from "@/lib/constants";
import type { Egreso, TipoEgreso } from "@/types/database";

/** Lista de egresos (compras/erogaciones), opcionalmente filtrada por tipo. */
export async function getEgresos(tipo?: TipoEgreso): Promise<Egreso[]> {
  const supabase = await createClient();
  let query = supabase
    .from("egresos")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (tipo) query = query.eq("tipo", tipo);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

// -----------------------------------------------------------------------------
// Estado de resultados
// -----------------------------------------------------------------------------
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export type MesResultado = {
  mes: string; // "2026-07"
  label: string; // "jul 2026"
  ventas: number;
  compras: number;
  erogaciones: number;
  resultado: number;
};

export type CategoriaEgreso = { categoria: string; monto: number };

export type EstadoResultados = {
  desde: string;
  hasta: string;
  ventas: number;
  compras: number;
  erogaciones: number;
  egresosTotal: number;
  resultado: number;
  margen: number; // resultado / ventas (0 si no hay ventas)
  cantVentas: number;
  mensual: MesResultado[];
  porCategoria: CategoriaEgreso[];
};

function mesKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function mesLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

/**
 * Estado de resultados de la unidad actual entre dos fechas (inclusive).
 * Ventas = pedidos facturados (estados que generan deuda), por fecha de creación.
 * Egresos = compras + erogaciones cargadas. Todo por su TOTAL (sin discriminar IVA).
 * RLS ya limita todo a la unidad del usuario.
 */
export async function getEstadoResultados(
  desde: string,
  hasta: string,
): Promise<EstadoResultados> {
  const supabase = await createClient();

  // hasta exclusivo (día siguiente) para incluir todo el día "hasta".
  const hastaExcl = new Date(hasta + "T00:00:00");
  hastaExcl.setDate(hastaExcl.getDate() + 1);
  const hastaExclStr = hastaExcl.toISOString().slice(0, 10);

  const [ventasRes, egresosRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select("total, fecha_creacion")
      .in("estado", ESTADOS_GENERAN_DEUDA)
      .gte("fecha_creacion", desde)
      .lt("fecha_creacion", hastaExclStr),
    supabase
      .from("egresos")
      .select("tipo, fecha, categoria, monto")
      .gte("fecha", desde)
      .lte("fecha", hasta),
  ]);
  if (ventasRes.error) throw new Error(ventasRes.error.message);
  if (egresosRes.error) throw new Error(egresosRes.error.message);

  // Bucket mensual entre desde y hasta.
  const buckets = new Map<string, MesResultado>();
  const cursor = new Date(desde + "T00:00:00");
  const fin = new Date(hasta + "T00:00:00");
  while (cursor <= fin) {
    const key = mesKey(cursor);
    if (!buckets.has(key)) {
      buckets.set(key, { mes: key, label: mesLabel(key), ventas: 0, compras: 0, erogaciones: 0, resultado: 0 });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const bucket = (d: Date) => {
    const key = mesKey(d);
    let b = buckets.get(key);
    if (!b) {
      b = { mes: key, label: mesLabel(key), ventas: 0, compras: 0, erogaciones: 0, resultado: 0 };
      buckets.set(key, b);
    }
    return b;
  };

  let ventas = 0;
  for (const p of ventasRes.data ?? []) {
    const monto = Number(p.total);
    ventas += monto;
    bucket(new Date(p.fecha_creacion)).ventas += monto;
  }

  let compras = 0;
  let erogaciones = 0;
  const porCategoria = new Map<string, number>();
  for (const e of egresosRes.data ?? []) {
    const monto = Number(e.monto);
    const b = bucket(new Date(e.fecha + "T00:00:00"));
    if (e.tipo === "compra") {
      compras += monto;
      b.compras += monto;
    } else {
      erogaciones += monto;
      b.erogaciones += monto;
    }
    const cat = e.categoria?.trim() || "Sin categoría";
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + monto);
  }

  const mensual = [...buckets.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  for (const m of mensual) m.resultado = m.ventas - m.compras - m.erogaciones;

  const egresosTotal = compras + erogaciones;
  const resultado = ventas - egresosTotal;

  return {
    desde,
    hasta,
    ventas,
    compras,
    erogaciones,
    egresosTotal,
    resultado,
    margen: ventas > 0 ? resultado / ventas : 0,
    cantVentas: ventasRes.data?.length ?? 0,
    mensual,
    porCategoria: [...porCategoria.entries()]
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto),
  };
}
