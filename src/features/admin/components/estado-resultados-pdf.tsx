import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Empresa } from "@/features/unidades/queries";
import type { EstadoResultados } from "../queries";

const styles = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingVertical: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    borderBottomWidth: 1.5, borderBottomColor: "#1a1a1a", paddingBottom: 12, marginBottom: 16,
  },
  empresaNombre: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  empresaInfo: { fontSize: 9, color: "#555", marginTop: 2 },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docMeta: { fontSize: 9, color: "#555", marginTop: 2, textAlign: "right" },
  pnlBox: { marginTop: 8, marginBottom: 18 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  rowLabel: { fontSize: 11 },
  rowVal: { fontSize: 11, textAlign: "right" },
  sub: { color: "#666", paddingLeft: 10 },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1.5, borderTopColor: "#1a1a1a", marginTop: 6, paddingTop: 8,
  },
  totalLabel: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  totalVal: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },
  sectionTitle: { fontSize: 8, color: "#888", textTransform: "uppercase", fontFamily: "Helvetica-Bold", marginBottom: 6, marginTop: 6 },
  th: { flexDirection: "row", backgroundColor: "#f2f2f2", borderBottomWidth: 1, borderBottomColor: "#ddd" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  cMes: { width: "28%", padding: 5, fontSize: 9 },
  cNum: { width: "24%", padding: 5, fontSize: 9, textAlign: "right" },
  thTxt: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#333" },
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center",
    fontSize: 8, color: "#aaa", borderTopWidth: 0.5, borderTopColor: "#eee", paddingTop: 6,
  },
});

export function EstadoResultadosPDF({
  estado,
  empresa,
}: {
  estado: EstadoResultados;
  empresa: Empresa;
}) {
  return (
    <Document title={`Estado de resultados - ${empresa.nombre}`} author={empresa.nombre}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.empresaNombre}>{empresa.nombre}</Text>
            {empresa.cuit ? <Text style={styles.empresaInfo}>CUIT: {empresa.cuit}</Text> : null}
            {empresa.direccion ? <Text style={styles.empresaInfo}>{empresa.direccion}</Text> : null}
          </View>
          <View>
            <Text style={styles.docTitle}>ESTADO DE RESULTADOS</Text>
            <Text style={styles.docMeta}>
              {formatDate(estado.desde)} — {formatDate(estado.hasta)}
            </Text>
          </View>
        </View>

        {/* Cuadro de resultado */}
        <View style={styles.pnlBox}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Ventas (pedidos facturados)</Text>
            <Text style={styles.rowVal}>{formatCurrency(estado.ventas)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, styles.sub]}>(−) Compras</Text>
            <Text style={styles.rowVal}>{formatCurrency(estado.compras)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, styles.sub]}>(−) Erogaciones</Text>
            <Text style={styles.rowVal}>{formatCurrency(estado.erogaciones)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>RESULTADO</Text>
            <Text style={styles.totalVal}>
              {formatCurrency(estado.resultado)}
              {estado.ventas > 0 ? `  (${(estado.margen * 100).toFixed(1)}%)` : ""}
            </Text>
          </View>
        </View>

        {/* Detalle mensual */}
        <Text style={styles.sectionTitle}>Detalle mensual</Text>
        <View>
          <View style={styles.th}>
            <Text style={[styles.cMes, styles.thTxt]}>Mes</Text>
            <Text style={[styles.cNum, styles.thTxt]}>Ventas</Text>
            <Text style={[styles.cNum, styles.thTxt]}>Egresos</Text>
            <Text style={[styles.cNum, styles.thTxt]}>Resultado</Text>
          </View>
          {estado.mensual.map((m) => (
            <View style={styles.tr} key={m.mes} wrap={false}>
              <Text style={styles.cMes}>{m.label}</Text>
              <Text style={styles.cNum}>{formatCurrency(m.ventas)}</Text>
              <Text style={styles.cNum}>{formatCurrency(m.compras + m.erogaciones)}</Text>
              <Text style={styles.cNum}>{formatCurrency(m.resultado)}</Text>
            </View>
          ))}
        </View>

        {/* Egresos por categoría */}
        {estado.porCategoria.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Egresos por categoría</Text>
            <View>
              {estado.porCategoria.map((c) => (
                <View style={styles.row} key={c.categoria} wrap={false}>
                  <Text style={styles.rowLabel}>{c.categoria}</Text>
                  <Text style={styles.rowVal}>{formatCurrency(c.monto)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.footer} fixed>
          {empresa.nombre} — Estado de resultados generado el {formatDate(new Date())}. Vista de
          gestión (no contable/fiscal). Ventas por fecha de creación del pedido.
        </Text>
      </Page>
    </Document>
  );
}
