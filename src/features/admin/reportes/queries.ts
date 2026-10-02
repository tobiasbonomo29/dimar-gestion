import { createClient } from "@/lib/supabase/server";
import { ESTADOS_GENERAN_DEUDA } from "@/lib/constants";
import type { Vendedor } from "@/types/database";

/**
 * Reporte gerencial: estado de resultados, ranking de vendedores, ventas a
 * Valmax y estado de cobranza, para un período general / anual / mensual.
 *
 * Criterios (los mismos que el resto de Administración, para que los números
 * cierren entre solapas):
 *  - Venta = pedido en estado que genera deuda (facturado en adelante, sin
 *    cancelados), imputada por su fecha de creación.
 *  - Importes del estado de resultados con IVA incluido (criterio de caja),
 *    igual que la solapa "Estado de resultados". La venta neta (sin IVA) se
 *    informa aparte y es la base del ranking de vendedores y comisiones.
 *  - Cobranza: los pagos son a nivel cliente y se imputan FIFO (la factura más
 *    vieja primero), igual que la cuenta corriente.
 *  - Los meses se cortan en hora argentina (los pedidos guardan fecha y hora).
 */

const TZ = "America/Argentina/Buenos_Aires";
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS_POR_VENCER = 7;

export type ModoReporte = "general" | "anio" | "mes";
export type PeriodoReporte = { modo: ModoReporte; anio?: number; mes?: number }; // mes: 1-12

export type MesRef = { key: string; label: string };

// --- Estado de resultados ----------------------------------------------------
export type EerrMes = {
  key: string;
  label: string;
  ventasBrutas: number;
  ventasNetas: number;
  compras: number;
  erogaciones: number;
  resultado: number;
};
export type EerrCategoria = { categoria: string; compras: number; erogaciones: number; total: number };
export type Eerr = {
  ventasBrutas: number;
  ivaVentas: number;
  ventasNetas: number;
  cantVentas: number;
  compras: number;
  erogaciones: number;
  egresosTotal: number;
  resultado: number;
  margen: number;
  aportes: number;
  mensual: EerrMes[];
  porCategoria: EerrCategoria[];
};

// --- Ranking de vendedores ---------------------------------------------------
export type RankingVendedor = {
  vendedor_id: string | null;
  nombre: string;
  comision_porcentaje: number | null;
  cantPedidos: number;
  cantClientes: number;
  ventasBrutas: number;
  ventasNetas: number;
  participacion: number; // sobre ventas netas del período
  ticketPromedio: number; // neto por pedido
  comision: number;
  porMes: Record<string, number>; // neto por mes
};

// --- Ventas a Valmax ---------------------------------------------------------
export type ValmaxPedido = {
  numero: number;
  fecha: string;
  estado: string;
  neto: number;
  iva: number;
  total: number;
  pagado: number;
  saldo: number;
};
export type ValmaxProducto = { descripcion: string; cantidad: number; monto: number };
export type VentasValmax = {
  clientes: string[];
  cantPedidos: number;
  ventasNetas: number;
  ventasBrutas: number;
  participacion: number; // sobre ventas netas totales del período
  pagado: number;
  saldo: number;
  pedidos: ValmaxPedido[];
  productos: ValmaxProducto[];
  porMes: Record<string, number>; // neto por mes
};

// --- Estado de cobranza ------------------------------------------------------
export type EstadoFactura = "al_dia" | "por_vencer" | "vencido";
export type FacturaPendiente = {
  numero: number;
  razon_social: string;
  fecha: string;
  vencimiento: string;
  dias: number; // días para vencer (negativo = vencida)
  estado: EstadoFactura;
  total: number;
  pagado: number;
  saldo: number;
};
export type CobranzaCliente = {
  razon_social: string;
  facturadoPeriodo: number;
  cobradoPeriodo: number;
  saldoActual: number;
  vencido: number;
  saldoAFavor: number;
};
export type CobranzaMes = { key: string; label: string; facturado: number; cobrado: number };
export type Cobranza = {
  fechaCorte: string; // hoy (la deuda es una foto al día de hoy)
  facturadoPeriodo: number;
  cobradoPeriodo: number;
  pendienteDelPeriodo: number; // de lo facturado en el período, lo que hoy sigue impago
  efectividad: number; // (facturado - pendiente) / facturado del período
  deudaTotal: number;
  alDia: number;
  porVencer: number;
  vencido1a30: number;
  vencido31a60: number;
  vencidoMas60: number;
  saldosAFavor: number;
  porCliente: CobranzaCliente[];
  pendientes: FacturaPendiente[];
  mensual: CobranzaMes[];
};

export type ReporteGerencial = {
  modo: ModoReporte;
  label: string;
  desde: string;
  hasta: string;
  generado: string; // fecha y hora de generación (AR)
  meses: MesRef[];
  eerr: Eerr;
  vendedores: RankingVendedor[];
  valmax: VentasValmax;
  cobranza: Cobranza;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const r2 = (n: number) => Math.round(n * 100) / 100;

const fmtDiaAR = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha (YYYY-MM-DD) en hora argentina de un timestamp. */
function diaAR(ts: string | Date): string {
  return fmtDiaAR.format(typeof ts === "string" ? new Date(ts) : ts);
}

function sumarDias(fecha: string, n: number): string {
  const d = new Date(fecha + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round(
    (new Date(hasta + "T12:00:00Z").getTime() - new Date(desde + "T12:00:00Z").getTime()) / 86400000,
  );
}

function mesLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

/** Meses (YYYY-MM) entre dos fechas, inclusive. */
function listaMeses(desde: string, hasta: string): MesRef[] {
  const out: MesRef[] = [];
  let [y, m] = desde.slice(0, 7).split("-").map(Number);
  const [yf, mf] = hasta.slice(0, 7).split("-").map(Number);
  while (y < yf || (y === yf && m <= mf)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push({ key, label: mesLabel(key) });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Pagina una consulta de a 1000 filas (límite por defecto de la API). */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

function resolverPeriodo(p: PeriodoReporte, hoy: string): { desde: string; hasta: string; label: string } {
  const anioActual = Number(hoy.slice(0, 4));
  if (p.modo === "mes") {
    const anio = p.anio ?? anioActual;
    const mes = p.mes ?? Number(hoy.slice(5, 7));
    const mm = String(mes).padStart(2, "0");
    const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    return {
      desde: `${anio}-${mm}-01`,
      hasta: `${anio}-${mm}-${String(ultimo).padStart(2, "0")}`,
      label: `${MESES_LARGO[mes - 1]} ${anio}`,
    };
  }
  if (p.modo === "anio") {
    const anio = p.anio ?? anioActual;
    return { desde: `${anio}-01-01`, hasta: `${anio}-12-31`, label: `Año ${anio}` };
  }
  return { desde: "2000-01-01", hasta: hoy, label: "General (histórico)" };
}

// -----------------------------------------------------------------------------
// Tipos de filas
// -----------------------------------------------------------------------------
type PedidoRow = {
  id: string;
  numero: number;
  fecha_creacion: string;
  fecha_vencimiento: string | null;
  estado: string;
  total: number;
  iva_monto: number;
  cliente_id: string;
  vendedor_id: string | null;
  clientes: { razon_social: string; condicion_pago_dias: number | null } | null;
};
type PagoRow = { cliente_id: string; monto: number; fecha: string };
type EgresoRow = { tipo: "compra" | "erogacion"; fecha: string; categoria: string | null; monto: number };

// -----------------------------------------------------------------------------
// Reporte
// -----------------------------------------------------------------------------
type DbClient = Awaited<ReturnType<typeof createClient>>;

export async function getReporteGerencial(
  p: PeriodoReporte,
  db?: DbClient, // inyectable para verificar los cálculos fuera de una request
): Promise<ReporteGerencial> {
  const supabase = db ?? (await createClient());
  const hoy = diaAR(new Date());
  const { desde, hasta, label } = resolverPeriodo(p, hoy);

  // Todos los pedidos que generan deuda (se necesitan todos para la foto de
  // cobranza FIFO); el período se filtra en memoria por fecha argentina.
  const [pedidos, pagos, egresos, aportes, vendedoresRes] = await Promise.all([
    fetchAll<PedidoRow>((from, to) =>
      supabase
        .from("pedidos")
        .select(
          "id, numero, fecha_creacion, fecha_vencimiento, estado, total, iva_monto, cliente_id, vendedor_id, clientes(razon_social, condicion_pago_dias)",
        )
        .in("estado", ESTADOS_GENERAN_DEUDA)
        .order("fecha_creacion", { ascending: true })
        .order("numero", { ascending: true })
        .range(from, to)
        .returns<PedidoRow[]>(),
    ),
    fetchAll<PagoRow>((from, to) =>
      supabase.from("pagos").select("cliente_id, monto, fecha").order("id").range(from, to),
    ),
    fetchAll<EgresoRow>((from, to) =>
      supabase
        .from("egresos")
        .select("tipo, fecha, categoria, monto")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("id")
        .range(from, to),
    ),
    fetchAll<{ monto: number; fecha: string }>((from, to) =>
      supabase
        .from("aportes_capital")
        .select("monto, fecha")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("id")
        .range(from, to),
    ),
    supabase.from("vendedores").select("*").returns<Vendedor[]>(),
  ]);
  if (vendedoresRes.error) throw new Error(vendedoresRes.error.message);
  const vendMap = new Map((vendedoresRes.data ?? []).map((v) => [v.id, v]));

  const enPeriodo = (fecha: string) => fecha >= desde && fecha <= hasta;
  const pedidosPeriodo = pedidos
    .map((x) => ({ ...x, dia: diaAR(x.fecha_creacion) }))
    .filter((x) => enPeriodo(x.dia));

  // Meses a mostrar: en "general" y "año" desde el primer movimiento del período
  // (sin meses vacíos al principio); nunca más allá de hoy.
  let inicioMeses = desde;
  if (p.modo !== "mes") {
    const primeros = [
      ...pedidosPeriodo.map((x) => x.dia),
      ...egresos.map((e) => e.fecha),
      ...pagos.filter((x) => enPeriodo(x.fecha)).map((x) => x.fecha),
    ].sort();
    inicioMeses = primeros[0] ?? (p.modo === "general" ? hoy : desde);
  }
  const finMeses = hasta < hoy ? hasta : hoy;
  const meses = inicioMeses <= finMeses ? listaMeses(inicioMeses, finMeses) : listaMeses(desde, desde);

  // --- Estado de resultados --------------------------------------------------
  const mensualMap = new Map<string, EerrMes>(
    meses.map((m) => [
      m.key,
      { key: m.key, label: m.label, ventasBrutas: 0, ventasNetas: 0, compras: 0, erogaciones: 0, resultado: 0 },
    ]),
  );
  const mesBucket = (key: string) => {
    let b = mensualMap.get(key);
    if (!b) {
      b = { key, label: mesLabel(key), ventasBrutas: 0, ventasNetas: 0, compras: 0, erogaciones: 0, resultado: 0 };
      mensualMap.set(key, b);
    }
    return b;
  };

  let ventasBrutas = 0;
  let ivaVentas = 0;
  for (const x of pedidosPeriodo) {
    const total = Number(x.total);
    const iva = Number(x.iva_monto);
    ventasBrutas += total;
    ivaVentas += iva;
    const b = mesBucket(x.dia.slice(0, 7));
    b.ventasBrutas += total;
    b.ventasNetas += total - iva;
  }

  let compras = 0;
  let erogaciones = 0;
  // Categorías agrupadas sin distinguir mayúsculas ("IMPUESTOS" = "Impuestos").
  const catMap = new Map<string, { labels: Map<string, number>; compras: number; erogaciones: number }>();
  for (const e of egresos) {
    const monto = Number(e.monto);
    const b = mesBucket(e.fecha.slice(0, 7));
    if (e.tipo === "compra") {
      compras += monto;
      b.compras += monto;
    } else {
      erogaciones += monto;
      b.erogaciones += monto;
    }
    const original = e.categoria?.trim() || "Sin categoría";
    const key = original.toUpperCase();
    let c = catMap.get(key);
    if (!c) {
      c = { labels: new Map(), compras: 0, erogaciones: 0 };
      catMap.set(key, c);
    }
    c.labels.set(original, (c.labels.get(original) ?? 0) + 1);
    if (e.tipo === "compra") c.compras += monto;
    else c.erogaciones += monto;
  }

  const mensual = [...mensualMap.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((m) => ({
      ...m,
      ventasBrutas: r2(m.ventasBrutas),
      ventasNetas: r2(m.ventasNetas),
      compras: r2(m.compras),
      erogaciones: r2(m.erogaciones),
      resultado: r2(m.ventasBrutas - m.compras - m.erogaciones),
    }));

  const porCategoria: EerrCategoria[] = [...catMap.values()]
    .map((c) => {
      const label = [...c.labels.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return {
        categoria: label,
        compras: r2(c.compras),
        erogaciones: r2(c.erogaciones),
        total: r2(c.compras + c.erogaciones),
      };
    })
    .sort((a, b) => b.total - a.total);

  const egresosTotal = compras + erogaciones;
  const resultado = ventasBrutas - egresosTotal;
  const eerr: Eerr = {
    ventasBrutas: r2(ventasBrutas),
    ivaVentas: r2(ivaVentas),
    ventasNetas: r2(ventasBrutas - ivaVentas),
    cantVentas: pedidosPeriodo.length,
    compras: r2(compras),
    erogaciones: r2(erogaciones),
    egresosTotal: r2(egresosTotal),
    resultado: r2(resultado),
    margen: ventasBrutas > 0 ? resultado / ventasBrutas : 0,
    aportes: r2(aportes.reduce((a, x) => a + Number(x.monto), 0)),
    mensual,
    porCategoria,
  };

  // --- Ranking de vendedores -------------------------------------------------
  const totalNetoPeriodo = ventasBrutas - ivaVentas;
  type AccV = {
    vendedor_id: string | null;
    clientes: Set<string>;
    cant: number;
    brutas: number;
    netas: number;
    comision: number;
    porMes: Record<string, number>;
  };
  const vMap = new Map<string, AccV>();
  for (const x of pedidosPeriodo) {
    const key = x.vendedor_id ?? "__sin__";
    let a = vMap.get(key);
    if (!a) {
      a = { vendedor_id: x.vendedor_id, clientes: new Set(), cant: 0, brutas: 0, netas: 0, comision: 0, porMes: {} };
      vMap.set(key, a);
    }
    const total = Number(x.total);
    const neto = total - Number(x.iva_monto);
    a.cant += 1;
    a.clientes.add(x.cliente_id);
    a.brutas += total;
    a.netas += neto;
    if (x.vendedor_id) {
      const pct = Number(vendMap.get(x.vendedor_id)?.comision_porcentaje ?? 3);
      // Mismo redondeo por pedido que la Liquidación.
      a.comision += Math.round(neto * pct) / 100;
    }
    const mk = x.dia.slice(0, 7);
    a.porMes[mk] = (a.porMes[mk] ?? 0) + neto;
  }
  // Vendedores activos sin ventas también aparecen (con 0), para el ranking completo.
  for (const v of vendedoresRes.data ?? []) {
    if (v.activo && !vMap.has(v.id)) {
      vMap.set(v.id, { vendedor_id: v.id, clientes: new Set(), cant: 0, brutas: 0, netas: 0, comision: 0, porMes: {} });
    }
  }
  const vendedores: RankingVendedor[] = [...vMap.values()]
    .map((a) => {
      const v = a.vendedor_id ? vendMap.get(a.vendedor_id) : null;
      return {
        vendedor_id: a.vendedor_id,
        nombre: a.vendedor_id ? v?.nombre ?? "Vendedor eliminado" : "Sin vendedor asignado",
        comision_porcentaje: a.vendedor_id ? Number(v?.comision_porcentaje ?? 3) : null,
        cantPedidos: a.cant,
        cantClientes: a.clientes.size,
        ventasBrutas: r2(a.brutas),
        ventasNetas: r2(a.netas),
        participacion: totalNetoPeriodo > 0 ? a.netas / totalNetoPeriodo : 0,
        ticketPromedio: a.cant > 0 ? r2(a.netas / a.cant) : 0,
        comision: r2(a.comision),
        porMes: Object.fromEntries(Object.entries(a.porMes).map(([k, n]) => [k, r2(n)])),
      };
    })
    // Ranking por venta neta; "Sin vendedor" siempre al final.
    .sort((a, b) => {
      if (!a.vendedor_id && b.vendedor_id) return 1;
      if (a.vendedor_id && !b.vendedor_id) return -1;
      return b.ventasNetas - a.ventasNetas;
    });

  // --- Cobranza: imputación FIFO de pagos (foto al día de hoy) ----------------
  const disponible = new Map<string, number>();
  for (const pg of pagos) {
    disponible.set(pg.cliente_id, (disponible.get(pg.cliente_id) ?? 0) + Number(pg.monto));
  }
  const imputado = new Map<string, { pagado: number; saldo: number }>();
  const pendientes: FacturaPendiente[] = [];
  const nombreCliente = new Map<string, string>();
  let alDia = 0, porVencer = 0, v1a30 = 0, v31a60 = 0, vMas60 = 0;
  const saldoCliente = new Map<string, { saldo: number; vencido: number }>();

  for (const x of pedidos) {
    nombreCliente.set(x.cliente_id, x.clientes?.razon_social ?? "—");
    const total = Number(x.total);
    const disp = disponible.get(x.cliente_id) ?? 0;
    const pagado = Math.min(total, Math.max(disp, 0));
    disponible.set(x.cliente_id, disp - pagado);
    const saldo = total - pagado;
    imputado.set(x.id, { pagado, saldo });
    if (saldo <= 0.01) continue;

    const emision = diaAR(x.fecha_creacion);
    const vencimiento = x.fecha_vencimiento ?? sumarDias(emision, Number(x.clientes?.condicion_pago_dias ?? 0));
    const dias = diasEntre(hoy, vencimiento);
    const estado: EstadoFactura = dias < 0 ? "vencido" : dias <= DIAS_POR_VENCER ? "por_vencer" : "al_dia";
    if (dias >= 0) {
      if (estado === "por_vencer") porVencer += saldo;
      else alDia += saldo;
    } else if (dias >= -30) v1a30 += saldo;
    else if (dias >= -60) v31a60 += saldo;
    else vMas60 += saldo;

    const sc = saldoCliente.get(x.cliente_id) ?? { saldo: 0, vencido: 0 };
    sc.saldo += saldo;
    if (dias < 0) sc.vencido += saldo;
    saldoCliente.set(x.cliente_id, sc);

    pendientes.push({
      numero: x.numero,
      razon_social: x.clientes?.razon_social ?? "—",
      fecha: emision,
      vencimiento,
      dias,
      estado,
      total: r2(total),
      pagado: r2(pagado),
      saldo: r2(saldo),
    });
  }
  pendientes.sort((a, b) => a.dias - b.dias || b.saldo - a.saldo);

  // Pagos de clientes sin facturas pendientes que los absorban = saldo a favor.
  const aFavor = new Map<string, number>();
  for (const [cid, resto] of disponible) if (resto > 0.01) aFavor.set(cid, resto);

  // Nombres de clientes que solo tienen pagos (sin pedidos facturados).
  const sinNombre = [...new Set(pagos.map((x) => x.cliente_id))].filter((id) => !nombreCliente.has(id));
  if (sinNombre.length > 0) {
    const { data } = await supabase.from("clientes").select("id, razon_social").in("id", sinNombre);
    for (const c of data ?? []) nombreCliente.set(c.id, c.razon_social);
  }

  const pagosPeriodo = pagos.filter((x) => enPeriodo(x.fecha));
  const cobradoPeriodo = pagosPeriodo.reduce((a, x) => a + Number(x.monto), 0);
  const pendienteDelPeriodo = pedidosPeriodo.reduce((a, x) => a + (imputado.get(x.id)?.saldo ?? 0), 0);

  const cliMap = new Map<string, CobranzaCliente>();
  const cli = (id: string) => {
    let c = cliMap.get(id);
    if (!c) {
      c = {
        razon_social: nombreCliente.get(id) ?? "—",
        facturadoPeriodo: 0,
        cobradoPeriodo: 0,
        saldoActual: 0,
        vencido: 0,
        saldoAFavor: 0,
      };
      cliMap.set(id, c);
    }
    return c;
  };
  for (const x of pedidosPeriodo) cli(x.cliente_id).facturadoPeriodo += Number(x.total);
  for (const x of pagosPeriodo) cli(x.cliente_id).cobradoPeriodo += Number(x.monto);
  for (const [id, s] of saldoCliente) {
    const c = cli(id);
    c.saldoActual += s.saldo;
    c.vencido += s.vencido;
  }
  for (const [id, n] of aFavor) cli(id).saldoAFavor += n;
  const porCliente = [...cliMap.values()]
    .map((c) => ({
      ...c,
      facturadoPeriodo: r2(c.facturadoPeriodo),
      cobradoPeriodo: r2(c.cobradoPeriodo),
      saldoActual: r2(c.saldoActual),
      vencido: r2(c.vencido),
      saldoAFavor: r2(c.saldoAFavor),
    }))
    .sort((a, b) => b.saldoActual - a.saldoActual || b.facturadoPeriodo - a.facturadoPeriodo);

  const cobMes = new Map<string, CobranzaMes>(
    meses.map((m) => [m.key, { key: m.key, label: m.label, facturado: 0, cobrado: 0 }]),
  );
  const cobBucket = (key: string) => {
    let b = cobMes.get(key);
    if (!b) {
      b = { key, label: mesLabel(key), facturado: 0, cobrado: 0 };
      cobMes.set(key, b);
    }
    return b;
  };
  for (const x of pedidosPeriodo) cobBucket(x.dia.slice(0, 7)).facturado += Number(x.total);
  for (const x of pagosPeriodo) cobBucket(x.fecha.slice(0, 7)).cobrado += Number(x.monto);

  const deudaTotal = alDia + porVencer + v1a30 + v31a60 + vMas60;
  const cobranza: Cobranza = {
    fechaCorte: hoy,
    facturadoPeriodo: r2(ventasBrutas),
    cobradoPeriodo: r2(cobradoPeriodo),
    pendienteDelPeriodo: r2(pendienteDelPeriodo),
    efectividad: ventasBrutas > 0 ? (ventasBrutas - pendienteDelPeriodo) / ventasBrutas : 0,
    deudaTotal: r2(deudaTotal),
    alDia: r2(alDia),
    porVencer: r2(porVencer),
    vencido1a30: r2(v1a30),
    vencido31a60: r2(v31a60),
    vencidoMas60: r2(vMas60),
    saldosAFavor: r2([...aFavor.values()].reduce((a, n) => a + n, 0)),
    porCliente,
    pendientes,
    mensual: [...cobMes.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => ({ ...m, facturado: r2(m.facturado), cobrado: r2(m.cobrado) })),
  };

  // --- Ventas a Valmax ---------------------------------------------------------
  const { data: valmaxCli, error: vErr } = await supabase
    .from("clientes")
    .select("id, razon_social")
    .ilike("razon_social", "%valmax%");
  if (vErr) throw new Error(vErr.message);
  const valmaxIds = new Set((valmaxCli ?? []).map((c) => c.id));
  const pedValmax = pedidosPeriodo.filter((x) => valmaxIds.has(x.cliente_id));

  const productosMap = new Map<string, ValmaxProducto>();
  const idsValmax = pedValmax.map((x) => x.id);
  for (let i = 0; i < idsValmax.length; i += 200) {
    const { data: items, error } = await supabase
      .from("pedido_items")
      .select("descripcion, cantidad, subtotal")
      .in("pedido_id", idsValmax.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const it of items ?? []) {
      const k = it.descripcion.trim();
      const cur = productosMap.get(k) ?? { descripcion: k, cantidad: 0, monto: 0 };
      cur.cantidad += Number(it.cantidad);
      cur.monto += Number(it.subtotal);
      productosMap.set(k, cur);
    }
  }

  const valmaxPedidos: ValmaxPedido[] = pedValmax.map((x) => {
    const total = Number(x.total);
    const iva = Number(x.iva_monto);
    const imp = imputado.get(x.id) ?? { pagado: 0, saldo: total };
    return {
      numero: x.numero,
      fecha: x.dia,
      estado: x.estado,
      neto: r2(total - iva),
      iva: r2(iva),
      total: r2(total),
      pagado: r2(imp.pagado),
      saldo: r2(imp.saldo),
    };
  });
  const vPorMes: Record<string, number> = {};
  for (const x of pedValmax) {
    const k = x.dia.slice(0, 7);
    vPorMes[k] = r2((vPorMes[k] ?? 0) + Number(x.total) - Number(x.iva_monto));
  }
  const vNetas = valmaxPedidos.reduce((a, x) => a + x.neto, 0);
  const valmax: VentasValmax = {
    clientes: (valmaxCli ?? []).map((c) => c.razon_social),
    cantPedidos: valmaxPedidos.length,
    ventasNetas: r2(vNetas),
    ventasBrutas: r2(valmaxPedidos.reduce((a, x) => a + x.total, 0)),
    participacion: totalNetoPeriodo > 0 ? vNetas / totalNetoPeriodo : 0,
    pagado: r2(valmaxPedidos.reduce((a, x) => a + x.pagado, 0)),
    saldo: r2(valmaxPedidos.reduce((a, x) => a + x.saldo, 0)),
    pedidos: valmaxPedidos,
    productos: [...productosMap.values()]
      .map((x) => ({ ...x, monto: r2(x.monto) }))
      .sort((a, b) => b.monto - a.monto),
    porMes: vPorMes,
  };

  const ahora = new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return {
    modo: p.modo,
    label,
    desde: p.modo === "general" ? inicioMeses : desde,
    hasta: p.modo === "general" ? hoy : hasta,
    generado: ahora,
    meses,
    eerr,
    vendedores,
    valmax,
    cobranza,
  };
}

/** Años con movimientos (para el selector), del primero al actual. */
export async function getAniosReporte(): Promise<number[]> {
  const supabase = await createClient();
  const [ped, egr] = await Promise.all([
    supabase.from("pedidos").select("fecha_creacion").order("fecha_creacion", { ascending: true }).limit(1),
    supabase.from("egresos").select("fecha").order("fecha", { ascending: true }).limit(1),
  ]);
  const actual = Number(diaAR(new Date()).slice(0, 4));
  const candidatos = [
    ped.data?.[0]?.fecha_creacion ? Number(diaAR(ped.data[0].fecha_creacion).slice(0, 4)) : actual,
    egr.data?.[0]?.fecha ? Number(String(egr.data[0].fecha).slice(0, 4)) : actual,
  ];
  const primero = Math.min(...candidatos, actual);
  const anios: number[] = [];
  for (let y = actual; y >= primero; y--) anios.push(y);
  return anios;
}
