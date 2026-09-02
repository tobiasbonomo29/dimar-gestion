import { createClient } from "@/lib/supabase/server";
import { ESTADOS_GENERAN_DEUDA } from "@/lib/constants";
import type { Egreso, TipoEgreso, AporteCapital, Vendedor, EstadoPedido } from "@/types/database";

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
export type EstadoVencimiento = "vencido" | "por_vencer" | "al_dia";

export type FacturaImpaga = {
  id: string;
  numero: number;
  razon_social: string;
  fecha: string;
  vencimiento: string;
  estado: EstadoVencimiento;
  diasParaVencer: number; // negativo = días vencida
  total: number;
  pagado: number;
  saldo: number;
};

type PedCobro = {
  id: string;
  numero: number;
  total: number;
  fecha_creacion: string;
  fecha_vencimiento: string | null;
  cliente_id: string;
  clientes: { razon_social: string; condicion_pago_dias: number } | null;
};

/** Vencimiento de la factura: explícito, o fecha de creación + días de plazo del cliente. */
function calcVencimiento(fechaCreacion: string, fechaVenc: string | null, dias: number): string {
  if (fechaVenc) return fechaVenc;
  const d = new Date(fechaCreacion);
  d.setDate(d.getDate() + (dias || 0));
  return d.toISOString().slice(0, 10);
}

/** Umbral (en días) para considerar una factura "próxima a vencer". */
const DIAS_POR_VENCER = 7;

/** Pedidos facturados cuyo pago registrado (asociado al pedido) es menor al total. */
export async function getFacturasImpagas(): Promise<FacturaImpaga[]> {
  const supabase = await createClient();
  // Igual que la cuenta corriente: los pagos son a nivel cliente y se imputan
  // a sus facturas de la más vieja a la más nueva (FIFO).
  const [pedsRes, pagosRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, numero, total, fecha_creacion, fecha_vencimiento, cliente_id, clientes(razon_social, condicion_pago_dias)")
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

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const res: FacturaImpaga[] = [];
  for (const p of pedsRes.data ?? []) {
    const total = Number(p.total);
    const disp = disponible.get(p.cliente_id) ?? 0;
    const pagado = Math.min(total, Math.max(disp, 0));
    disponible.set(p.cliente_id, disp - pagado);
    const saldo = total - pagado;
    if (saldo > 0.01) {
      const vencimiento = calcVencimiento(
        p.fecha_creacion,
        p.fecha_vencimiento,
        p.clientes?.condicion_pago_dias ?? 0,
      );
      const diasParaVencer = Math.round(
        (new Date(vencimiento + "T00:00:00").getTime() - hoy.getTime()) / 86400000,
      );
      const estado: EstadoVencimiento =
        diasParaVencer < 0 ? "vencido" : diasParaVencer <= DIAS_POR_VENCER ? "por_vencer" : "al_dia";
      res.push({
        id: p.id,
        numero: p.numero,
        razon_social: p.clientes?.razon_social ?? "—",
        fecha: p.fecha_creacion,
        vencimiento,
        estado,
        diasParaVencer,
        total,
        pagado,
        saldo,
      });
    }
  }
  // Ordena: primero lo más vencido (menor diasParaVencer), luego por saldo.
  return res.sort((a, b) => a.diasParaVencer - b.diasParaVencer || b.saldo - a.saldo);
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
// Pendiente por producto (a producir / entregar)
// -----------------------------------------------------------------------------
// Pedidos comprometidos que todavía NO se despacharon (excluye cotizaciones y
// cancelados). Es una foto del momento, no depende del período.
const ESTADOS_PENDIENTE_ENTREGA: EstadoPedido[] = [
  "confirmado",
  "facturado",
  "en_produccion",
  "listo_despachar",
];

export type PendienteProducto = {
  producto_id: string | null;
  descripcion: string;
  pedidos: number; // cantidad de pedidos que lo incluyen
  pendiente: number; // unidades pedidas y no entregadas
  stock: number | null; // stock actual (si es producto del catálogo)
  aProducir: number; // lo que falta fabricar = max(pendiente − stock, 0)
};

export async function getPendientePorProducto(): Promise<PendienteProducto[]> {
  const supabase = await createClient();

  const { data: peds, error } = await supabase
    .from("pedidos")
    .select("id")
    .in("estado", ESTADOS_PENDIENTE_ENTREGA);
  if (error) throw new Error(error.message);
  const ids = (peds ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const { data: items, error: e2 } = await supabase
    .from("pedido_items")
    .select("pedido_id, producto_id, descripcion, cantidad")
    .in("pedido_id", ids);
  if (e2) throw new Error(e2.message);

  // Stock actual de los productos del catálogo involucrados.
  const prodIds = [...new Set((items ?? []).map((i) => i.producto_id).filter(Boolean))] as string[];
  const stockMap = new Map<string, number>();
  if (prodIds.length > 0) {
    const { data: prods } = await supabase.from("productos").select("id, stock").in("id", prodIds);
    for (const p of prods ?? []) stockMap.set(p.id, Number(p.stock));
  }

  type Acc = { producto_id: string | null; descripcion: string; pendiente: number; pedidos: Set<string> };
  const map = new Map<string, Acc>();
  for (const it of items ?? []) {
    const key = it.producto_id ?? `txt:${it.descripcion.trim().toLowerCase()}`;
    let a = map.get(key);
    if (!a) {
      a = { producto_id: it.producto_id ?? null, descripcion: it.descripcion, pendiente: 0, pedidos: new Set() };
      map.set(key, a);
    }
    a.pendiente += Number(it.cantidad);
    a.pedidos.add(it.pedido_id);
  }

  return [...map.values()]
    .map((a) => {
      const stock = a.producto_id ? stockMap.get(a.producto_id) ?? 0 : null;
      const aProducir = stock != null ? Math.max(a.pendiente - stock, 0) : a.pendiente;
      return {
        producto_id: a.producto_id,
        descripcion: a.descripcion,
        pedidos: a.pedidos.size,
        pendiente: a.pendiente,
        stock,
        aProducir,
      };
    })
    .sort((x, y) => y.pendiente - x.pendiente);
}

// -----------------------------------------------------------------------------
// Estadísticas: ventas por producto (mensual)
// -----------------------------------------------------------------------------
export type VentaProductoMes = {
  descripcion: string;
  totalCantidad: number;
  totalMonto: number;
  porMes: Record<string, { cantidad: number; monto: number }>;
};
export type VentasPorProducto = {
  meses: { key: string; label: string }[];
  productos: VentaProductoMes[];
  totalMonto: number;
};

export async function getVentasPorProductoMensual(
  desde: string,
  hasta: string,
): Promise<VentasPorProducto> {
  const supabase = await createClient();

  const { data: peds, error } = await supabase
    .from("pedidos")
    .select("id, fecha_creacion")
    .in("estado", ESTADOS_GENERAN_DEUDA)
    .gte("fecha_creacion", desde)
    .lt("fecha_creacion", hastaExclusivo(hasta));
  if (error) throw new Error(error.message);

  // Lista de meses del período.
  const meses: { key: string; label: string }[] = [];
  const cur = new Date(desde + "T00:00:00");
  const fin = new Date(hasta + "T00:00:00");
  while (cur <= fin) {
    const k = mesKey(cur);
    if (!meses.some((m) => m.key === k)) meses.push({ key: k, label: mesLabel(k) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const pedMes = new Map<string, string>();
  for (const p of peds ?? []) pedMes.set(p.id, mesKey(new Date(p.fecha_creacion)));
  const ids = [...pedMes.keys()];
  if (ids.length === 0) return { meses, productos: [], totalMonto: 0 };

  const map = new Map<string, VentaProductoMes>();
  // Trae los ítems en lotes (por si hay muchos pedidos).
  for (let i = 0; i < ids.length; i += 200) {
    const lote = ids.slice(i, i + 200);
    const { data: items, error: e2 } = await supabase
      .from("pedido_items")
      .select("pedido_id, descripcion, cantidad, subtotal")
      .in("pedido_id", lote);
    if (e2) throw new Error(e2.message);
    for (const it of items ?? []) {
      const mes = pedMes.get(it.pedido_id);
      if (!mes) continue;
      let p = map.get(it.descripcion);
      if (!p) {
        p = { descripcion: it.descripcion, totalCantidad: 0, totalMonto: 0, porMes: {} };
        map.set(it.descripcion, p);
      }
      const cant = Number(it.cantidad);
      const monto = Number(it.subtotal);
      p.totalCantidad += cant;
      p.totalMonto += monto;
      const cell = p.porMes[mes] ?? { cantidad: 0, monto: 0 };
      cell.cantidad += cant;
      cell.monto += monto;
      p.porMes[mes] = cell;
    }
  }

  const productos = [...map.values()].sort((a, b) => b.totalMonto - a.totalMonto);
  return { meses, productos, totalMonto: productos.reduce((a, p) => a + p.totalMonto, 0) };
}

// -----------------------------------------------------------------------------
// Estadísticas: stock de insumos (valorizado al último precio de compra)
// -----------------------------------------------------------------------------
export type InsumoStock = {
  id: string;
  nombre: string;
  presentacion: string | null;
  unidad_medida: string;
  stock: number;
  stock_minimo: number;
  bajo: boolean;
  ultimoPrecio: number;
  valor: number;
};
export type StockInsumos = { insumos: InsumoStock[]; totalValor: number; bajoMinimo: number };

export async function getStockInsumos(): Promise<StockInsumos> {
  const supabase = await createClient();
  const [insRes, itemsRes] = await Promise.all([
    supabase.from("insumos").select("*").order("nombre", { ascending: true }),
    supabase
      .from("compra_items")
      .select("insumo_id, precio_unitario, created_at")
      .not("insumo_id", "is", null)
      .order("created_at", { ascending: false }),
  ]);
  if (insRes.error) throw new Error(insRes.error.message);
  if (itemsRes.error) throw new Error(itemsRes.error.message);

  // Último precio de compra por insumo (el primero, porque vienen desc por fecha).
  const lastPrice = new Map<string, number>();
  for (const it of itemsRes.data ?? []) {
    if (it.insumo_id && !lastPrice.has(it.insumo_id)) {
      lastPrice.set(it.insumo_id, Number(it.precio_unitario));
    }
  }

  const insumos: InsumoStock[] = (insRes.data ?? []).map((i) => {
    const ultimoPrecio = lastPrice.get(i.id) ?? 0;
    const stock = Number(i.stock);
    return {
      id: i.id,
      nombre: i.nombre,
      presentacion: i.presentacion,
      unidad_medida: i.unidad_medida,
      stock,
      stock_minimo: Number(i.stock_minimo),
      bajo: Number(i.stock_minimo) > 0 && stock <= Number(i.stock_minimo),
      ultimoPrecio,
      valor: stock * ultimoPrecio,
    };
  });

  return {
    insumos,
    totalValor: insumos.reduce((a, x) => a + x.valor, 0),
    bajoMinimo: insumos.filter((x) => x.bajo).length,
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
