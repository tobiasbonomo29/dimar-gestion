import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { EMPRESA } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ClienteConSaldo } from "../queries";

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
  table: { marginTop: 4, borderWidth: 1, borderColor: "#ddd" },
  tableHead: { flexDirection: "row", backgroundColor: "#f2f2f2", borderBottomWidth: 1, borderBottomColor: "#ddd" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  th: { fontSize: 8.5, fontFamily: "Helvetica-Bold", padding: 6, color: "#333" },
  td: { fontSize: 9, padding: 6 },
  colCliente: { width: "40%" },
  colContacto: { width: "30%" },
  colFacturado: { width: "15%", textAlign: "right" },
  colSaldo: { width: "15%", textAlign: "right" },
  summaryBox: { marginTop: 12, alignItems: "flex-end" },
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

export function PendientesPDF({ clientes }: { clientes: ClienteConSaldo[] }) {
  const conDeuda = clientes
    .filter((c) => c.saldo > 0.01)
    .sort((a, b) => b.saldo - a.saldo);
  const totalPendiente = conDeuda.reduce((acc, c) => acc + c.saldo, 0);

  return (
    <Document title={`Pendientes de cobro - ${EMPRESA.nombre}`} author={EMPRESA.nombre}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.empresaNombre}>{EMPRESA.nombre}</Text>
            {EMPRESA.cuit ? <Text style={styles.empresaInfo}>CUIT: {EMPRESA.cuit}</Text> : null}
            {EMPRESA.direccion ? <Text style={styles.empresaInfo}>{EMPRESA.direccion}</Text> : null}
          </View>
          <View style={styles.docTitleBox}>
            <Text style={styles.docTitle}>PENDIENTES DE COBRO</Text>
            <Text style={styles.docMeta}>Emitido: {formatDate(new Date())}</Text>
            <Text style={styles.docMeta}>{conDeuda.length} cliente(s) con saldo</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colCliente]}>Cliente</Text>
            <Text style={[styles.th, styles.colContacto]}>Contacto</Text>
            <Text style={[styles.th, styles.colFacturado]}>Facturado</Text>
            <Text style={[styles.th, styles.colSaldo]}>Saldo</Text>
          </View>
          {conDeuda.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { width: "100%" }]}>No hay clientes con saldo pendiente.</Text>
            </View>
          ) : (
            conDeuda.map((c) => (
              <View style={styles.tableRow} key={c.id} wrap={false}>
                <Text style={[styles.td, styles.colCliente]}>{c.razon_social}</Text>
                <Text style={[styles.td, styles.colContacto]}>
                  {[c.telefono, c.email].filter(Boolean).join(" · ") || "—"}
                </Text>
                <Text style={[styles.td, styles.colFacturado]}>{formatCurrency(c.facturado)}</Text>
                <Text style={[styles.td, styles.colSaldo, { fontFamily: "Helvetica-Bold" }]}>
                  {formatCurrency(c.saldo)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryFinalRow}>
            <Text style={styles.summaryFinalLabel}>Total pendiente de cobro</Text>
            <Text style={styles.summaryFinalValue}>{formatCurrency(totalPendiente)}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {EMPRESA.nombre} — Reporte de cuentas por cobrar generado el {formatDate(new Date())}.
        </Text>
      </Page>
    </Document>
  );
}
