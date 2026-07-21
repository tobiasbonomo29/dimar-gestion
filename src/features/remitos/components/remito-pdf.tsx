import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { EMPRESA } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import type { Remito, RemitoItem } from "@/types/database";

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
  block: { width: "60%" },
  blockLabel: { fontSize: 8, color: "#888", textTransform: "uppercase", marginBottom: 3, fontFamily: "Helvetica-Bold" },
  blockLine: { fontSize: 9.5, marginBottom: 1.5 },
  table: { marginTop: 4, borderWidth: 1, borderColor: "#ddd" },
  tableHead: { flexDirection: "row", backgroundColor: "#f2f2f2", borderBottomWidth: 1, borderBottomColor: "#ddd" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  th: { fontSize: 8.5, fontFamily: "Helvetica-Bold", padding: 6, color: "#333" },
  td: { fontSize: 9, padding: 6 },
  colDesc: { width: "70%" },
  colCant: { width: "15%", textAlign: "right" },
  colUnidad: { width: "15%", textAlign: "left" },
  notasBox: { marginTop: 14 },
  notasLabel: { fontSize: 8, color: "#888", textTransform: "uppercase", marginBottom: 3, fontFamily: "Helvetica-Bold" },
  notasText: { fontSize: 9.5 },
  firma: { marginTop: 48, flexDirection: "row", justifyContent: "space-between" },
  firmaBox: { width: "45%", borderTopWidth: 0.5, borderTopColor: "#888", paddingTop: 4, alignItems: "center" },
  firmaText: { fontSize: 8, color: "#888" },
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center",
    fontSize: 8, color: "#aaa", borderTopWidth: 0.5, borderTopColor: "#eee", paddingTop: 6,
  },
});

type RemitoItemLike = Pick<RemitoItem, "descripcion" | "cantidad" | "unidad">;

export function RemitoPDF({
  remito,
  items,
}: {
  remito: Remito;
  items: RemitoItemLike[];
}) {
  return (
    <Document title={`REMITO N°${remito.numero} - ${EMPRESA.nombre}`} author={EMPRESA.nombre}>
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
            <Text style={styles.docTitle}>REMITO</Text>
            <Text style={styles.docMeta}>N° {String(remito.numero).padStart(4, "0")}</Text>
            <Text style={styles.docMeta}>Fecha: {formatDate(remito.fecha)}</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Destinatario</Text>
            <Text style={[styles.blockLine, { fontFamily: "Helvetica-Bold" }]}>
              {remito.destinatario}
            </Text>
            {remito.destinatario_cuit ? (
              <Text style={styles.blockLine}>CUIT {remito.destinatario_cuit}</Text>
            ) : null}
            {remito.destinatario_direccion ? (
              <Text style={styles.blockLine}>{remito.destinatario_direccion}</Text>
            ) : null}
          </View>
        </View>

        {/* Mercadería */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
            <Text style={[styles.th, styles.colCant]}>Cantidad</Text>
            <Text style={[styles.th, styles.colUnidad]}>Unidad</Text>
          </View>
          {items.map((it, i) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              <Text style={[styles.td, styles.colDesc]}>{it.descripcion}</Text>
              <Text style={[styles.td, styles.colCant]}>{formatNumber(it.cantidad)}</Text>
              <Text style={[styles.td, styles.colUnidad]}>{it.unidad ?? "—"}</Text>
            </View>
          ))}
        </View>

        {remito.notas ? (
          <View style={styles.notasBox}>
            <Text style={styles.notasLabel}>Observaciones</Text>
            <Text style={styles.notasText}>{remito.notas}</Text>
          </View>
        ) : null}

        <View style={styles.firma}>
          <View style={styles.firmaBox}><Text style={styles.firmaText}>Entregó</Text></View>
          <View style={styles.firmaBox}><Text style={styles.firmaText}>Recibió (aclaración y firma)</Text></View>
        </View>

        <Text style={styles.footer} fixed>
          {EMPRESA.nombre} — Remito interno generado el {formatDate(remito.fecha)}.
          {" "}Documento no válido como comprobante fiscal (AFIP).
        </Text>
      </Page>
    </Document>
  );
}
