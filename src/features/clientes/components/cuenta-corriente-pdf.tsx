import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { EMPRESA, CONDICIONES_FISCALES, ESTADOS_PEDIDO, MEDIOS_PAGO } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CuentaCorriente } from "../queries";

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
  sectionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  block: { width: "48%" },
  blockLabel: { fontSize: 8, color: "#888", textTransform: "uppercase", marginBottom: 3, fontFamily: "Helvetica-Bold" },
  blockLine: { fontSize: 9.5, marginBottom: 1.5 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 6 },
  table: { marginTop: 4, borderWidth: 1, borderColor: "#ddd" },
  tableHead: { flexDirection: "row", backgroundColor: "#f2f2f2", borderBottomWidth: 1, borderBottomColor: "#ddd" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  th: { fontSize: 8.5, fontFamily: "Helvetica-Bold", padding: 6, color: "#333" },
  td: { fontSize: 9, padding: 6 },
  colNumero: { width: "14%" },
  colFecha: { width: "18%" },
  colEstado: { width: "20%" },
  colTotal: { width: "16%", textAlign: "right" },
  colPagado: { width: "16%", textAlign: "right" },
  colPendiente: { width: "16%", textAlign: "right" },
  colPagoFecha: { width: "16%" },
  colPagoMedio: { width: "20%" },
  colPagoNota: { width: "44%" },
  colPagoMonto: { width: "20%", textAlign: "right" },
  summaryBox: { marginTop: 12, alignItems: "flex-end" },
  summaryRow: { flexDirection: "row", width: 240, justifyContent: "space-between", paddingVertical: 2 },
  summaryLabel: { fontSize: 9.5, color: "#555" },
  summaryValue: { fontSize: 9.5, textAlign: "right" },
  summaryFinalRow: {
    flexDirection: "row", width: 240, justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "#1a1a1a", marginTop: 4, paddingTop: 4,
  },
  summaryFinalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  summaryFinalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center",
    fontSize: 8, color: "#aaa", borderTopWidth: 0.5, borderTopColor: "#eee", paddingTop: 6,
  },
});

export function CuentaCorrientePDF({ cuenta }: { cuenta: CuentaCorriente }) {
  const { cliente, pedidos, pagos, totalFacturado, totalCobrado, saldo } = cuenta;
  const pendientes = pedidos.filter((p) => p.pendiente > 0.01);

  return (
    <Document
      title={`Cuenta corriente - ${cliente.razon_social}`}
      author={EMPRESA.nombre}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.empresaNombre}>{EMPRESA.nombre}</Text>
            {EMPRESA.cuit ? <Text style={styles.empresaInfo}>CUIT: {EMPRESA.cuit}</Text> : null}
            {EMPRESA.direccion ? <Text style={styles.empresaInfo}>{EMPRESA.direccion}</Text> : null}
            {(EMPRESA.email || EMPRESA.telefono) ? (
              <Text style={styles.empresaInfo}>
                {[EMPRESA.email, EMPRESA.telefono].filter(Boolean).join("  ·  ")}
              </Text>
            ) : null}
          </View>
          <View style={styles.docTitleBox}>
            <Text style={styles.docTitle}>CUENTA CORRIENTE</Text>
            <Text style={styles.docMeta}>Emitido: {formatDate(new Date())}</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Cliente</Text>
            <Text style={[styles.blockLine, { fontFamily: "Helvetica-Bold" }]}>
              {cliente.razon_social}
            </Text>
            {cliente.nombre_contacto ? <Text style={styles.blockLine}>{cliente.nombre_contacto}</Text> : null}
            <Text style={styles.blockLine}>
              {CONDICIONES_FISCALES[cliente.condicion_fiscal]}
              {cliente.cuit ? ` · CUIT ${cliente.cuit}` : ""}
            </Text>
            {cliente.direccion ? <Text style={styles.blockLine}>{cliente.direccion}</Text> : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Pedidos pendientes de cobro</Text>
        {pendientes.length === 0 ? (
          <Text style={{ fontSize: 9.5, color: "#555" }}>No hay pedidos con saldo pendiente.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.colNumero]}>Pedido</Text>
              <Text style={[styles.th, styles.colFecha]}>Fecha</Text>
              <Text style={[styles.th, styles.colEstado]}>Estado</Text>
              <Text style={[styles.th, styles.colTotal]}>Total</Text>
              <Text style={[styles.th, styles.colPagado]}>Pagado</Text>
              <Text style={[styles.th, styles.colPendiente]}>Pendiente</Text>
            </View>
            {pendientes.map((p) => (
              <View style={styles.tableRow} key={p.id} wrap={false}>
                <Text style={[styles.td, styles.colNumero]}>#{p.numero}</Text>
                <Text style={[styles.td, styles.colFecha]}>{formatDate(p.fecha_creacion)}</Text>
                <Text style={[styles.td, styles.colEstado]}>{ESTADOS_PEDIDO[p.estado].label}</Text>
                <Text style={[styles.td, styles.colTotal]}>{formatCurrency(p.total)}</Text>
                <Text style={[styles.td, styles.colPagado]}>{formatCurrency(p.pagado)}</Text>
                <Text style={[styles.td, styles.colPendiente, { fontFamily: "Helvetica-Bold" }]}>
                  {formatCurrency(p.pendiente)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Pagos registrados</Text>
        {pagos.length === 0 ? (
          <Text style={{ fontSize: 9.5, color: "#555" }}>No hay pagos registrados.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.colPagoFecha]}>Fecha</Text>
              <Text style={[styles.th, styles.colPagoMedio]}>Medio</Text>
              <Text style={[styles.th, styles.colPagoNota]}>Nota</Text>
              <Text style={[styles.th, styles.colPagoMonto]}>Monto</Text>
            </View>
            {pagos.map((p) => (
              <View style={styles.tableRow} key={p.id} wrap={false}>
                <Text style={[styles.td, styles.colPagoFecha]}>{formatDate(p.fecha)}</Text>
                <Text style={[styles.td, styles.colPagoMedio]}>{MEDIOS_PAGO[p.medio_pago]}</Text>
                <Text style={[styles.td, styles.colPagoNota]}>{p.nota ?? "—"}</Text>
                <Text style={[styles.td, styles.colPagoMonto]}>{formatCurrency(p.monto)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total facturado</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalFacturado)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total cobrado</Text>
            <Text style={styles.summaryValue}>-{formatCurrency(totalCobrado)}</Text>
          </View>
          <View style={styles.summaryFinalRow}>
            <Text style={styles.summaryFinalLabel}>Saldo {saldo > 0 ? "adeudado" : "a favor"}</Text>
            <Text style={styles.summaryFinalValue}>{formatCurrency(Math.abs(saldo))}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {EMPRESA.nombre} — Cuenta corriente generada el {formatDate(new Date())}. Documento interno, no válido como comprobante fiscal.
        </Text>
      </Page>
    </Document>
  );
}
