import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { EMPRESA } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LiquidacionVendedor } from "../queries";

const styles = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingVertical: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    borderBottomWidth: 1.5, borderBottomColor: "#1a1a1a", paddingBottom: 12, marginBottom: 16,
  },
  empresaNombre: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  empresaInfo: { fontSize: 9, color: "#555", marginTop: 2 },
  docTitleBox: { alignItems: "flex-end" },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  docMeta: { fontSize: 9, color: "#555", marginTop: 2 },
  vendedorBox: { marginBottom: 12 },
  vendedorNombre: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  vendedorSub: { fontSize: 9, color: "#555", marginTop: 2 },
  table: { marginTop: 4, borderWidth: 1, borderColor: "#ddd" },
  tableHead: { flexDirection: "row", backgroundColor: "#f2f2f2", borderBottomWidth: 1, borderBottomColor: "#ddd" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  th: { fontSize: 8.5, fontFamily: "Helvetica-Bold", padding: 6, color: "#333" },
  td: { fontSize: 9, padding: 6 },
  colFecha: { width: "14%" },
  colComp: { width: "10%" },
  colCliente: { width: "34%" },
  colNeto: { width: "22%", textAlign: "right" },
  colComision: { width: "20%", textAlign: "right" },
  summaryBox: { marginTop: 12, alignItems: "flex-end" },
  summaryRow: { flexDirection: "row", width: 260, justifyContent: "space-between", paddingVertical: 2 },
  summaryLabel: { fontSize: 10, color: "#555" },
  summaryValue: { fontSize: 10, textAlign: "right" },
  summaryFinalRow: {
    flexDirection: "row", width: 260, justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "#1a1a1a", marginTop: 4, paddingTop: 4,
  },
  summaryFinalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  summaryFinalValue: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right" },
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center",
    fontSize: 8, color: "#aaa", borderTopWidth: 0.5, borderTopColor: "#eee", paddingTop: 6,
  },
});

export function LiquidacionPDF({
  vendedor,
  desde,
  hasta,
}: {
  vendedor: LiquidacionVendedor;
  desde: string;
  hasta: string;
}) {
  return (
    <Document title={`Liquidación ${vendedor.nombre} - ${EMPRESA.nombre}`} author={EMPRESA.nombre}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.empresaNombre}>{EMPRESA.nombre}</Text>
            {EMPRESA.cuit ? <Text style={styles.empresaInfo}>CUIT: {EMPRESA.cuit}</Text> : null}
            {EMPRESA.direccion ? <Text style={styles.empresaInfo}>{EMPRESA.direccion}</Text> : null}
          </View>
          <View style={styles.docTitleBox}>
            <Text style={styles.docTitle}>LIQUIDACIÓN DE COMISIÓN</Text>
            <Text style={styles.docMeta}>Período: {desde} a {hasta}</Text>
            <Text style={styles.docMeta}>Emitido: {formatDate(new Date())}</Text>
          </View>
        </View>

        <View style={styles.vendedorBox}>
          <Text style={styles.vendedorNombre}>{vendedor.nombre}</Text>
          <Text style={styles.vendedorSub}>
            Comisión {vendedor.comision_porcentaje}% sobre la venta sin impuestos (neto) de lo facturado.
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colFecha]}>Fecha</Text>
            <Text style={[styles.th, styles.colComp]}>Pedido</Text>
            <Text style={[styles.th, styles.colCliente]}>Cliente</Text>
            <Text style={[styles.th, styles.colNeto]}>Neto s/IVA</Text>
            <Text style={[styles.th, styles.colComision]}>Comisión</Text>
          </View>
          {vendedor.pedidos.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { width: "100%" }]}>Sin pedidos facturados en el período.</Text>
            </View>
          ) : (
            vendedor.pedidos.map((p) => (
              <View style={styles.tableRow} key={p.pedido_id} wrap={false}>
                <Text style={[styles.td, styles.colFecha]}>{formatDate(p.fecha)}</Text>
                <Text style={[styles.td, styles.colComp]}>#{p.numero}</Text>
                <Text style={[styles.td, styles.colCliente]}>{p.razon_social}</Text>
                <Text style={[styles.td, styles.colNeto]}>{formatCurrency(p.neto)}</Text>
                <Text style={[styles.td, styles.colComision, { fontFamily: "Helvetica-Bold" }]}>
                  {formatCurrency(p.comision)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pedidos facturados</Text>
            <Text style={styles.summaryValue}>{vendedor.cantPedidos}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Neto sin impuestos</Text>
            <Text style={styles.summaryValue}>{formatCurrency(vendedor.netoTotal)}</Text>
          </View>
          <View style={styles.summaryFinalRow}>
            <Text style={styles.summaryFinalLabel}>Comisión a liquidar</Text>
            <Text style={styles.summaryFinalValue}>{formatCurrency(vendedor.comisionTotal)}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {EMPRESA.nombre} — Liquidación de {vendedor.nombre} generada el {formatDate(new Date())}.
        </Text>
      </Page>
    </Document>
  );
}
