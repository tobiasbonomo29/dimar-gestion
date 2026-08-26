import { createClient } from "@/lib/supabase/server";
import { ESTADOS_GENERAN_DEUDA } from "@/lib/constants";
import type { Egreso, TipoEgreso, AporteCapital, Vendedor } from "@/types/database";

function hastaExclusivo(hasta: string): string {
  const d = new Date(hasta + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

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

// -----------------------------------------------------------------------------
// Facturación (drill-down por cliente y por producto)
// -----------------------------------------------------------------------------
export type FacturacionCliente = {
  cliente_id: string;
  razon_social: string;
  cuit: string | null;
  monto: number;
  cantidad: number;
};
export type FacturacionProducto = { descripcion: string; cantidad: number; monto: number };
export type Facturacion = {
  total: number;
  cantFacturas: number;
  porCliente: FacturacionCliente[];
  porProducto: FacturacionProducto[];
};

type PedFact = {
  id: string;
  total: number;
  cliente_id: string;
  clientes: { razon_social: string; cuit: string | null } | null;
};

/** Total facturado del período + desglose por cliente y por producto. */
export async function getFacturacion(desde: string, hasta: string): Promise<Facturacion> {
  const supabase = await createClient();
  const { data: peds, error } = await supabase
    .from("pedidos")
    .select("id, total, cliente_id, clientes(razon_social, cuit)")
    .in("estado", ESTADOS_GENERAN_DEUDA)
    .gte("fecha_creacion", desde)
    .lt("fecha_creacion", hastaExclusivo(hasta))
    .returns<PedFact[]>();
  if (error) throw new Error(error.message);

  const ids = (peds ?? []).map((p) => p.id);
  let items: { descripcion: string; cantidad: number; subtotal: number }[] = [];
  if (ids.length > 0) {
    const { data, error: e2 } = await supabase
      .from("pedido_items")
      .select("descripcion, cantidad, subtotal")
      .in("pedido_id", ids);
    if (e2) throw new Error(e2.message);
    items = data ?? [];
  }

  let total = 0;
  const porCliente = new Map<string, FacturacionCliente>();
  for (const p of peds ?? []) {
    total += Number(p.total);
    const cur =
      porCliente.get(p.cliente_id) ??
      {
        cliente_id: p.cliente_id,
        razon_social: p.clientes?.razon_social ?? "—",
        cuit: p.clientes?.cuit ?? null,
        monto: 0,
        cantidad: 0,
      };
    cur.monto += Number(p.total);
    cur.cantidad += 1;
    porCliente.set(p.cliente_id, cur);
  }

  const porProducto = new Map<string, FacturacionProducto>();
  for (const it of items) {
    const cur = porProducto.get(it.descripcion) ?? { descripcion: it.descripcion, cantidad: 0, monto: 0 };
    cur.cantidad += Number(it.cantidad);
    cur.monto += Number(it.subtotal);
    porProducto.set(it.descripcion, cur);
  }

  return {
    total,
    cantFacturas: peds?.length ?? 0,
    porCliente: [...porCliente.values()].sort((a, b) => b.monto - a.monto),
    porProducto: [...porProducto.values()].sort((a, b) => b.monto - a.monto),
  };
}

// -----------------------------------------------------------------------------
// Facturas impagas (pendientes de cobro)
// -----------------------------------------------------------------------------
export type FacturaImpaga = {
  id: string;
  numero: number;
  razon_social: string;
  fecha: string;
  total: number;
  pagado: number;
  saldo: number;
};

type PedCobro = {
  id: string;
  numero: number;
  total: number;
  fecha_creacion: string;
  cliente_id: string;
  clientes: { razon_social: string } | null;
};

/** Pedidos facturados cuyo pago registrado (asociado al pedido) es menor al total. */
export async function getFacturasImpagas(): Promise<FacturaImpaga[]> {
  const supabase = await createClient();
  // Igual que la cuenta corriente: los pagos son a nivel cliente y se imputan
  // a sus facturas de la más vieja a la más nueva (FIFO).
  const [pedsRes, pagosRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, numero, total, fecha_creacion, cliente_id, clientes(razon_social)")
      .in("estado", ESTADOS_GENERAN_DEUDA)
      .order("fecha_creacion", { ascending: true })
      .returns<PedCobro[]>(),
    supabase.from("pagos").select("cliente_id, monto"),
  ]);
  if (pedsRes.error) throw new Error(pedsRes.error.message);
  if (pagosRes.error) throw new Error(pagosRes.error.message);

  // Saldo disponible por cliente = suma de todos sus pagos.
  const disponible = new Map<string, number>();
  for (const pg of pagosRes.data ?? []) {
    disponible.set(pg.cliente_id, (disponible.get(pg.cliente_id) ?? 0) + Number(pg.monto));
  }

  const res: FacturaImpaga[] = [];
  for (const p of pedsRes.data ?? []) {
    const total = Number(p.total);
    const disp = disponible.get(p.cliente_id) ?? 0;
    const pagado = Math.min(total, Math.max(disp, 0));
    disponible.set(p.cliente_id, disp - pagado);
    const saldo = total - pagado;
    if (saldo > 0.01) {
      res.push({
        id: p.id,
        numero: p.numero,
        razon_social: p.clientes?.razon_social ?? "—",
        fecha: p.fecha_creacion,
        total,
        pagado,
        saldo,
      });
    }
  }
  return res.sort((a, b) => b.saldo - a.saldo);
}

// -----------------------------------------------------------------------------
// Liquidación de vendedores (comisión sobre lo facturado, neto sin IVA)
// -----------------------------------------------------------------------------
export type LiquidacionPedido = {
  pedido_id: string;
  numero: number;
  fecha: string;
  razon_social: string;
  cuit: string | null;
  total: number;
  neto: number; // venta sin impuestos (total − IVA)
  comision: number;
};

export type LiquidacionVendedor = {
  vendedor_id: string;
  nombre: string;
  comision_porcentaje: number;
  cantPedidos: number;
  netoTotal: number;
  comisionTotal: number;
  pedidos: LiquidacionPedido[];
};

export type Liquidacion = {
  desde: string;
  hasta: string;
  vendedores: LiquidacionVendedor[];
  netoTotal: number;
  comisionTotal: number;
  sinVendedor: { cantPedidos: number; netoTotal: number };
};

type PedLiq = {
  id: string;
  numero: number;
  fecha_creacion: string;
  total: number;
  iva_monto: number;
  vendedor_id: string | null;
  clientes: { razon_social: string; cuit: string | null } | null;
};

/**
 * Liquidación de comisiones por vendedor entre dos fechas (inclusive).
 * Considera solo pedidos facturados (los que generan deuda). La base de la
 * comisión es la "venta sin impuestos" = total − IVA; el porcentaje sale de
 * cada vendedor (comision_porcentaje, 3% por defecto). Si se pasa vendedorId,
 * filtra a ese vendedor.
 */
export async function getLiquidacion(
  desde: string,
  hasta: string,
  vendedorId?: string,
): Promise<Liquidacion> {
  const supabase = await createClient();

  const [pedsRes, vendedoresRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, numero, fecha_creacion, total, iva_monto, vendedor_id, clientes(razon_social, cuit)")
      .in("estado", ESTADOS_GENERAN_DEUDA)
      .gte("fecha_creacion", desde)
      .lt("fecha_creacion", hastaExclusivo(hasta))
      .order("fecha_creacion", { ascending: true })
      .returns<PedLiq[]>(),
    supabase.from("vendedores").select("*").returns<Vendedor[]>(),
  ]);
  if (pedsRes.error) throw new Error(pedsRes.error.message);
  if (vendedoresRes.error) throw new Error(vendedoresRes.error.message);

  const vendedores = vendedoresRes.data ?? [];
  const vendMap = new Map(vendedores.map((v) => [v.id, v]));

  const grupos = new Map<string, LiquidacionVendedor>();
  const sinVendedor = { cantPedidos: 0, netoTotal: 0 };

  for (const p of pedsRes.data ?? []) {
    const total = Number(p.total);
    const neto = total - Number(p.iva_monto);

    if (!p.vendedor_id) {
      sinVendedor.cantPedidos += 1;
      sinVendedor.netoTotal += neto;
      continue;
    }
    if (vendedorId && p.vendedor_id !== vendedorId) continue;

    const vend = vendMap.get(p.vendedor_id);
    const pct = vend ? Number(vend.comision_porcentaje) : 3;
    const comision = Math.round(neto * pct) / 100;

    let g = grupos.get(p.vendedor_id);
    if (!g) {
      g = {
        vendedor_id: p.vendedor_id,
        nombre: vend?.nombre ?? "Vendedor eliminado",
        comision_porcentaje: pct,
        cantPedidos: 0,
        netoTotal: 0,
        comisionTotal: 0,
        pedidos: [],
      };
      grupos.set(p.vendedor_id, g);
    }
    g.cantPedidos += 1;
    g.netoTotal += neto;
    g.comisionTotal += comision;
    g.pedidos.push({
      pedido_id: p.id,
      numero: p.numero,
      fecha: p.fecha_creacion,
      razon_social: p.clientes?.razon_social ?? "—",
      cuit: p.clientes?.cuit ?? null,
      total,
      neto,
      comision,
    });
  }

  const lista = [...grupos.values()].sort((a, b) => b.comisionTotal - a.comisionTotal);
  return {
    desde,
    hasta,
    vendedores: lista,
    netoTotal: lista.reduce((a, v) => a + v.netoTotal, 0),
    comisionTotal: lista.reduce((a, v) => a + v.comisionTotal, 0),
    sinVendedor,
  };
}

// -----------------------------------------------------------------------------
// Aportes de capital
// -----------------------------------------------------------------------------
export async function getAportes(
  desde: string,
  hasta: string,
): Promise<{ aportes: AporteCapital[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("aportes_capital")
    .select("*")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false });
  if (error) throw new Error(error.message);
  const aportes = data ?? [];
  return { aportes, total: aportes.reduce((a, x) => a + Number(x.monto), 0) };
}
