import { exportSheetsToExcel } from "@/lib/export-excel";
import type { ReporteGerencial } from "./queries";
import { ESTADO_PEDIDO_LABEL, fechaAR, textoVencimiento } from "./format";

/** Proporción redondeada a 4 decimales (en Excel se ve como 0,1234 = 12,34%). */
const p4 = (n: number) => Math.round(n * 10000) / 10000;

export function descargarReporteExcel(r: ReporteGerencial, archivo: string) {
  const { eerr, cobranza, valmax } = r;
  const varios = r.meses.length > 1;

  const sheets: { name: string; rows: Record<string, string | number>[] }[] = [
    {
      name: "Estado de resultados",
      rows: [
        { Concepto: "Período", Importe: `${r.label} (${fechaAR(r.desde)} a ${fechaAR(r.hasta)})` },
        { Concepto: "Ventas (con IVA)", Importe: eerr.ventasBrutas },
        { Concepto: "  IVA ventas", Importe: eerr.ivaVentas },
        { Concepto: "  Ventas netas (sin IVA)", Importe: eerr.ventasNetas },
        { Concepto: "Cantidad de ventas", Importe: eerr.cantVentas },
        { Concepto: "Compras", Importe: -eerr.compras },
        { Concepto: "Erogaciones", Importe: -eerr.erogaciones },
        { Concepto: "Total egresos", Importe: -eerr.egresosTotal },
        { Concepto: "RESULTADO", Importe: eerr.resultado },
        { Concepto: "Margen sobre ventas", Importe: p4(eerr.margen) },
        { Concepto: "Aportes de capital (fuera del resultado)", Importe: eerr.aportes },
        { Concepto: "Criterio", Importe: "Importes con IVA incluido; ventas = pedidos facturados por fecha de carga" },
      ],
    },
    {
      name: "EERR por categoría",
      rows: eerr.porCategoria.map((c) => ({
        Categoría: c.categoria,
        Compras: c.compras,
        Erogaciones: c.erogaciones,
        Total: c.total,
      })),
    },
  ];

  if (varios) {
    sheets.push({
      name: "EERR mensual",
      rows: [
        ...eerr.mensual.map((m) => ({
          Mes: m.label,
          "Ventas (con IVA)": m.ventasBrutas,
          "Ventas netas": m.ventasNetas,
          Compras: m.compras,
          Erogaciones: m.erogaciones,
          Resultado: m.resultado,
        })),
        {
          Mes: "TOTAL",
          "Ventas (con IVA)": eerr.ventasBrutas,
          "Ventas netas": eerr.ventasNetas,
          Compras: eerr.compras,
          Erogaciones: eerr.erogaciones,
          Resultado: eerr.resultado,
        },
      ],
    });
  }

  sheets.push({
    name: "Ranking vendedores",
    rows: r.vendedores.map((v, i) => ({
      "#": v.vendedor_id ? i + 1 : "-",
      Vendedor: v.nombre,
      Pedidos: v.cantPedidos,
      Clientes: v.cantClientes,
      "Ventas netas (sin IVA)": v.ventasNetas,
      "Ventas con IVA": v.ventasBrutas,
      Participación: p4(v.participacion),
      "Ticket promedio (neto)": v.ticketPromedio,
      "Comisión %": v.comision_porcentaje ?? "",
      Comisión: v.comision,
    })),
  });

  if (varios) {
    sheets.push({
      name: "Vendedores por mes",
      rows: r.vendedores.map((v) => {
        const row: Record<string, string | number> = { Vendedor: v.nombre };
        for (const m of r.meses) row[m.label] = v.porMes[m.key] ?? 0;
        row["Total neto"] = v.ventasNetas;
        return row;
      }),
    });
  }

  sheets.push(
    {
      name: "Valmax - pedidos",
      rows: [
        ...valmax.pedidos.map((x) => ({
          Pedido: x.numero,
          Fecha: fechaAR(x.fecha),
          Estado: ESTADO_PEDIDO_LABEL[x.estado] ?? x.estado,
          "Neto (sin IVA)": x.neto,
          IVA: x.iva,
          Total: x.total,
          Cobrado: x.pagado,
          Saldo: x.saldo,
        })),
        {
          Pedido: "TOTAL",
          Fecha: "",
          Estado: `${valmax.cantPedidos} pedidos · ${(valmax.participacion * 100).toFixed(1)}% de las ventas netas`,
          "Neto (sin IVA)": valmax.ventasNetas,
          IVA: Math.round((valmax.ventasBrutas - valmax.ventasNetas) * 100) / 100,
          Total: valmax.ventasBrutas,
          Cobrado: valmax.pagado,
          Saldo: valmax.saldo,
        },
      ],
    },
    {
      name: "Valmax - productos",
      rows: valmax.productos.map((x) => ({
        Producto: x.descripcion,
        Cantidad: x.cantidad,
        "Monto (sin IVA)": x.monto,
      })),
    },
    {
      name: "Cobranza resumen",
      rows: [
        { Concepto: "Período", Importe: `${r.label} (${fechaAR(r.desde)} a ${fechaAR(r.hasta)})` },
        { Concepto: "Facturado en el período", Importe: cobranza.facturadoPeriodo },
        { Concepto: "Cobrado en el período (pagos recibidos)", Importe: cobranza.cobradoPeriodo },
        { Concepto: "De lo facturado en el período, pendiente hoy", Importe: cobranza.pendienteDelPeriodo },
        { Concepto: "Efectividad de cobro del período", Importe: p4(cobranza.efectividad) },
        { Concepto: `Deuda total de clientes al ${fechaAR(cobranza.fechaCorte)}`, Importe: cobranza.deudaTotal },
        { Concepto: "  Al día", Importe: cobranza.alDia },
        { Concepto: "  Por vencer (7 días)", Importe: cobranza.porVencer },
        { Concepto: "  Vencido 1 a 30 días", Importe: cobranza.vencido1a30 },
        { Concepto: "  Vencido 31 a 60 días", Importe: cobranza.vencido31a60 },
        { Concepto: "  Vencido más de 60 días", Importe: cobranza.vencidoMas60 },
        { Concepto: "Saldos a favor de clientes", Importe: cobranza.saldosAFavor },
      ],
    },
    {
      name: "Cobranza por cliente",
      rows: cobranza.porCliente.map((c) => ({
        Cliente: c.razon_social,
        "Facturado período": c.facturadoPeriodo,
        "Cobrado período": c.cobradoPeriodo,
        "Saldo actual": c.saldoActual,
        "Vencido actual": c.vencido,
        "Saldo a favor": c.saldoAFavor,
      })),
    },
    {
      name: "Facturas pendientes",
      rows: cobranza.pendientes.map((f) => ({
        Pedido: f.numero,
        Cliente: f.razon_social,
        Emisión: fechaAR(f.fecha),
        Vencimiento: fechaAR(f.vencimiento),
        Situación: textoVencimiento(f.dias),
        Total: f.total,
        Cobrado: f.pagado,
        Saldo: f.saldo,
      })),
    },
  );

  if (varios) {
    sheets.push({
      name: "Cobranza mensual",
      rows: cobranza.mensual.map((m) => ({ Mes: m.label, Facturado: m.facturado, Cobrado: m.cobrado })),
    });
  }

  exportSheetsToExcel(sheets, archivo);
}
