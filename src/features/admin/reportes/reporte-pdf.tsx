import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Empresa } from "@/features/unidades/queries";
import type { ReporteGerencial } from "./queries";
import { ESTADO_PEDIDO_LABEL, fechaAR, pct, textoVencimiento } from "./format";

const s = StyleSheet.create({
  page: { paddingHorizontal: 34, paddingTop: 30, paddingBottom: 44, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    borderBottomWidth: 1.5, borderBottomColor: "#1a1a1a", paddingBottom: 10, marginBottom: 14,
  },
  empresa: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  info: { fontSize: 8, color: "#555", marginTop: 2 },
  docTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docMeta: { fontSize: 8, color: "#555", marginTop: 2, textAlign: "right" },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  h2sub: { fontSize: 8, color: "#666", marginBottom: 10 },
  h3: { fontSize: 8, color: "#777", textTransform: "uppercase", fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 5 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  lineSub: { color: "#666", paddingLeft: 12 },
  lineTotal: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1.5, borderTopColor: "#1a1a1a", marginTop: 4, paddingTop: 6,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  kpis: { flexDirection: "row", gap: 6, marginBottom: 4 },
  kpi: { flex: 1, borderWidth: 0.75, borderColor: "#ddd", borderRadius: 3, padding: 6 },
  kpiLabel: { fontSize: 7, color: "#666" },
  kpiVal: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  table: { borderWidth: 0.75, borderColor: "#ddd" },
  th: { flexDirection: "row", backgroundColor: "#f2f2f2", borderBottomWidth: 0.75, borderBottomColor: "#ddd" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  trTotal: { flexDirection: "row", backgroundColor: "#f7f7f7", borderTopWidth: 0.75, borderTopColor: "#bbb" },
  cell: { padding: 4, fontSize: 8 },
  thTxt: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#333" },
  num: { textAlign: "right" },
  neg: { color: "#b91c1c" },
  note: { fontSize: 7.5, color: "#777", marginTop: 6 },
  footer: {
    position: "absolute", bottom: 18, left: 34, right: 34, flexDirection: "row", justifyContent: "space-between",
    fontSize: 7, color: "#999", borderTopWidth: 0.5, borderTopColor: "#eee", paddingTop: 5,
  },
});

type Col = { w: string; num?: boolean };

function Tabla({
  cols,
  head,
  rows,
  total,
}: {
  cols: Col[];
  head: string[];
  rows: (string | number)[][];
  total?: (string | number)[];
}) {
  const cell = (c: Col, v: string | number, i: number, bold?: boolean) => (
    <Text key={i} style={[s.cell, { width: c.w }, c.num ? s.num : {}, bold ? s.bold : {}]}>
      {String(v)}
    </Text>
  );
  return (
    <View style={s.table}>
      <View style={s.th} fixed>
        {head.map((h, i) => (
          <Text key={i} style={[s.cell, s.thTxt, { width: cols[i].w }, cols[i].num ? s.num : {}]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? (
        <View style={s.tr}>
          <Text style={[s.cell, { width: "100%", color: "#888" }]}>Sin datos en el período.</Text>
        </View>
      ) : (
        rows.map((r, ri) => (
          <View key={ri} style={s.tr} wrap={false}>
            {r.map((v, i) => cell(cols[i], v, i))}
          </View>
        ))
      )}
      {total && (
        <View style={s.trTotal} wrap={false}>
          {total.map((v, i) => cell(cols[i], v, i, true))}
        </View>
      )}
    </View>
  );
}

function Linea({ label, valor, sub, negativo }: { label: string; valor: string; sub?: boolean; negativo?: boolean }) {
  return (
    <View style={s.line}>
      <Text style={sub ? s.lineSub : {}}>{label}</Text>
      <Text style={negativo ? s.neg : {}}>{valor}</Text>
    </View>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiVal}>{valor}</Text>
    </View>
  );
}

const $ = formatCurrency;

export function ReporteGerencialPDF({ r, empresa }: { r: ReporteGerencial; empresa: Empresa }) {
  const { eerr, cobranza: cb, valmax: vx } = r;
  const varios = r.meses.length > 1;
  const periodo = `${r.label} · ${fechaAR(r.desde)} al ${fechaAR(r.hasta)}`;

  const Header = (
    <View style={s.header} fixed>
      <View>
        <Text style={s.empresa}>{empresa.nombre}</Text>
        {empresa.cuit ? <Text style={s.info}>CUIT: {empresa.cuit}</Text> : null}
        {empresa.direccion ? <Text style={s.info}>{empresa.direccion}</Text> : null}
      </View>
      <View>
        <Text style={s.docTitle}>REPORTE GERENCIAL</Text>
        <Text style={s.docMeta}>{periodo}</Text>
        <Text style={s.docMeta}>Generado: {r.generado}</Text>
      </View>
    </View>
  );
  const Footer = (
    <View style={s.footer} fixed>
      <Text>{empresa.nombre} — Reporte gerencial · {r.label}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );

  return (
    <Document title={`Reporte gerencial ${r.label} - ${empresa.nombre}`} author={empresa.nombre}>
      {/* 1. Estado de resultados */}
      <Page size="A4" style={s.page}>
        {Header}
        <Text style={s.h2}>1. Estado de resultados</Text>
        <Text style={s.h2sub}>
          Importes con IVA incluido (criterio de caja). Ventas = pedidos facturados por fecha de carga.
        </Text>

        <Linea label="Ventas (con IVA)" valor={$(eerr.ventasBrutas)} />
        <Linea label="IVA ventas" valor={$(eerr.ivaVentas)} sub />
        <Linea label="Ventas netas (sin IVA)" valor={$(eerr.ventasNetas)} sub />
        <Linea label={`Cantidad de ventas`} valor={String(eerr.cantVentas)} sub />
        <Linea label="Compras" valor={`− ${$(eerr.compras)}`} negativo />
        <Linea label="Erogaciones" valor={`− ${$(eerr.erogaciones)}`} negativo />
        <Linea label="Total egresos" valor={`− ${$(eerr.egresosTotal)}`} negativo />
        <View style={s.lineTotal}>
          <Text style={[s.bold, { fontSize: 11 }]}>RESULTADO</Text>
          <Text style={[s.bold, { fontSize: 11 }, eerr.resultado < 0 ? s.neg : {}]}>
            {$(eerr.resultado)} ({pct(eerr.margen)})
          </Text>
        </View>
        {eerr.aportes > 0 && (
          <Text style={s.note}>
            Aportes de capital del período: {$(eerr.aportes)} — no forman parte del resultado operativo.
          </Text>
        )}

        {varios && (
          <>
            <Text style={s.h3}>Evolución mensual</Text>
            <Tabla
              cols={[{ w: "16%" }, { w: "17%", num: true }, { w: "17%", num: true }, { w: "16%", num: true }, { w: "17%", num: true }, { w: "17%", num: true }]}
              head={["Mes", "Ventas c/IVA", "Ventas netas", "Compras", "Erogaciones", "Resultado"]}
              rows={eerr.mensual.map((m) => [m.label, $(m.ventasBrutas), $(m.ventasNetas), $(m.compras), $(m.erogaciones), $(m.resultado)])}
              total={["TOTAL", $(eerr.ventasBrutas), $(eerr.ventasNetas), $(eerr.compras), $(eerr.erogaciones), $(eerr.resultado)]}
            />
          </>
        )}

        <Text style={s.h3}>Egresos por categoría</Text>
        <Tabla
          cols={[{ w: "40%" }, { w: "20%", num: true }, { w: "20%", num: true }, { w: "20%", num: true }]}
          head={["Categoría", "Compras", "Erogaciones", "Total"]}
          rows={eerr.porCategoria.map((c) => [c.categoria, $(c.compras), $(c.erogaciones), $(c.total)])}
          total={["TOTAL", $(eerr.compras), $(eerr.erogaciones), $(eerr.egresosTotal)]}
        />
        {Footer}
      </Page>

      {/* 2. Ranking de vendedores */}
      <Page size="A4" style={s.page}>
        {Header}
        <Text style={s.h2}>2. Ranking de ventas por vendedor</Text>
        <Text style={s.h2sub}>
          Ordenado por venta neta (sin IVA) de pedidos facturados. Comisión según el % de cada vendedor.
        </Text>
        <Tabla
          cols={[{ w: "5%" }, { w: "23%" }, { w: "8%", num: true }, { w: "8%", num: true }, { w: "16%", num: true }, { w: "10%", num: true }, { w: "15%", num: true }, { w: "15%", num: true }]}
          head={["#", "Vendedor", "Pedidos", "Clientes", "Venta neta", "Partic.", "Ticket prom.", "Comisión"]}
          rows={r.vendedores.map((v, i) => [
            v.vendedor_id ? String(i + 1) : "—",
            v.nombre,
            v.cantPedidos,
            v.cantClientes,
            $(v.ventasNetas),
            pct(v.participacion),
            $(v.ticketPromedio),
            v.vendedor_id ? `${$(v.comision)}` : "—",
          ])}
          total={[
            "",
            "TOTAL",
            r.vendedores.reduce((a, v) => a + v.cantPedidos, 0),
            "",
            $(eerr.ventasNetas),
            "100%",
            "",
            $(r.vendedores.reduce((a, v) => a + v.comision, 0)),
          ]}
        />
        {varios && (
          <>
            <Text style={s.h3}>Venta neta por mes</Text>
            <Tabla
              cols={[{ w: "28%" }, ...r.meses.slice(-6).map(() => ({ w: `${60 / Math.min(r.meses.length, 6)}%`, num: true })), { w: "12%", num: true }]}
              head={["Vendedor", ...r.meses.slice(-6).map((m) => m.label), "Total"]}
              rows={r.vendedores.map((v) => [
                v.nombre,
                ...r.meses.slice(-6).map((m) => formatNumber(Math.round(v.porMes[m.key] ?? 0))),
                formatNumber(Math.round(v.ventasNetas)),
              ])}
            />
            {r.meses.length > 6 && (
              <Text style={s.note}>Se muestran los últimos 6 meses; el detalle completo está en el Excel.</Text>
            )}
          </>
        )}
        {Footer}
      </Page>

      {/* 3. Ventas a Valmax */}
      <Page size="A4" style={s.page}>
        {Header}
        <Text style={s.h2}>3. Ventas a Valmax</Text>
        <Text style={s.h2sub}>
          {vx.clientes.length > 0 ? `Cliente: ${vx.clientes.join(", ")}.` : "No hay un cliente Valmax cargado."} Saldos
          al {fechaAR(cb.fechaCorte)}.
        </Text>
        <View style={s.kpis}>
          <Kpi label="Pedidos" valor={String(vx.cantPedidos)} />
          <Kpi label="Venta neta (sin IVA)" valor={$(vx.ventasNetas)} />
          <Kpi label="Venta con IVA" valor={$(vx.ventasBrutas)} />
          <Kpi label="% de las ventas netas" valor={pct(vx.participacion)} />
        </View>
        <View style={s.kpis}>
          <Kpi label="Cobrado" valor={$(vx.pagado)} />
          <Kpi label="Saldo pendiente" valor={$(vx.saldo)} />
        </View>
        <Text style={s.h3}>Pedidos</Text>
        <Tabla
          cols={[{ w: "9%" }, { w: "12%" }, { w: "15%" }, { w: "16%", num: true }, { w: "16%", num: true }, { w: "16%", num: true }, { w: "16%", num: true }]}
          head={["Pedido", "Fecha", "Estado", "Neto", "Total c/IVA", "Cobrado", "Saldo"]}
          rows={vx.pedidos.map((x) => [
            `#${x.numero}`,
            fechaAR(x.fecha),
            ESTADO_PEDIDO_LABEL[x.estado] ?? x.estado,
            $(x.neto),
            $(x.total),
            $(x.pagado),
            $(x.saldo),
          ])}
          total={vx.pedidos.length ? ["TOTAL", "", "", $(vx.ventasNetas), $(vx.ventasBrutas), $(vx.pagado), $(vx.saldo)] : undefined}
        />
        {vx.productos.length > 0 && (
          <>
            <Text style={s.h3}>Productos vendidos</Text>
            <Tabla
              cols={[{ w: "60%" }, { w: "15%", num: true }, { w: "25%", num: true }]}
              head={["Producto", "Cantidad", "Monto (sin IVA)"]}
              rows={vx.productos.map((x) => [x.descripcion, formatNumber(x.cantidad), $(x.monto)])}
            />
          </>
        )}
        {Footer}
      </Page>

      {/* 4. Estado de cobranza */}
      <Page size="A4" style={s.page}>
        {Header}
        <Text style={s.h2}>4. Estado de cobranza</Text>
        <Text style={s.h2sub}>
          Pagos imputados a la factura más antigua de cada cliente. La deuda es una foto al {fechaAR(cb.fechaCorte)}.
        </Text>
        <View style={s.kpis}>
          <Kpi label="Facturado en el período" valor={$(cb.facturadoPeriodo)} />
          <Kpi label="Cobrado en el período" valor={$(cb.cobradoPeriodo)} />
          <Kpi label="Pendiente de lo facturado" valor={$(cb.pendienteDelPeriodo)} />
          <Kpi label="Efectividad de cobro" valor={pct(cb.efectividad)} />
        </View>

        <Text style={s.h3}>Antigüedad de la deuda al {fechaAR(cb.fechaCorte)}</Text>
        <Linea label="Al día" valor={$(cb.alDia)} />
        <Linea label="Por vencer (próximos 7 días)" valor={$(cb.porVencer)} />
        <Linea label="Vencido 1 a 30 días" valor={$(cb.vencido1a30)} negativo={cb.vencido1a30 > 0} />
        <Linea label="Vencido 31 a 60 días" valor={$(cb.vencido31a60)} negativo={cb.vencido31a60 > 0} />
        <Linea label="Vencido más de 60 días" valor={$(cb.vencidoMas60)} negativo={cb.vencidoMas60 > 0} />
        <View style={s.lineTotal}>
          <Text style={s.bold}>DEUDA TOTAL DE CLIENTES</Text>
          <Text style={s.bold}>{$(cb.deudaTotal)}</Text>
        </View>
        {cb.saldosAFavor > 0 && (
          <Text style={s.note}>Saldos a favor de clientes (pagos sin factura que los absorba): {$(cb.saldosAFavor)}.</Text>
        )}

        <Text style={s.h3}>Por cliente</Text>
        <Tabla
          cols={[{ w: "32%" }, { w: "17%", num: true }, { w: "17%", num: true }, { w: "17%", num: true }, { w: "17%", num: true }]}
          head={["Cliente", "Facturado período", "Cobrado período", "Saldo actual", "Vencido"]}
          rows={cb.porCliente.map((c) => [
            c.razon_social + (c.saldoAFavor > 0 ? ` (a favor ${$(c.saldoAFavor)})` : ""),
            $(c.facturadoPeriodo),
            $(c.cobradoPeriodo),
            $(c.saldoActual),
            $(c.vencido),
          ])}
          total={[
            "TOTAL",
            $(cb.facturadoPeriodo),
            $(cb.cobradoPeriodo),
            $(cb.deudaTotal),
            $(cb.vencido1a30 + cb.vencido31a60 + cb.vencidoMas60),
          ]}
        />

        <Text style={s.h3}>Facturas pendientes de cobro</Text>
        <Tabla
          cols={[{ w: "8%" }, { w: "27%" }, { w: "11%" }, { w: "11%" }, { w: "17%" }, { w: "13%", num: true }, { w: "13%", num: true }]}
          head={["Pedido", "Cliente", "Emisión", "Vence", "Situación", "Total", "Saldo"]}
          rows={cb.pendientes.map((f) => [
            `#${f.numero}`,
            f.razon_social,
            fechaAR(f.fecha),
            fechaAR(f.vencimiento),
            textoVencimiento(f.dias),
            $(f.total),
            $(f.saldo),
          ])}
          total={cb.pendientes.length ? ["", "TOTAL", "", "", "", "", $(cb.deudaTotal)] : undefined}
        />
        {Footer}
      </Page>
    </Document>
  );
}
