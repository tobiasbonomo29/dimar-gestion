import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate, formatNumber } from "@/lib/format";
import type { Empresa } from "@/features/unidades/queries";
import type { Reposicion } from "../queries";

const styles = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingVertical: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    borderBottomWidth: 1.5, borderBottomColor: "#1a1a1a", paddingBottom: 12, marginBottom: 14,
  },
  empresaNombre: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  empresaInfo: { fontSize: 9, color: "#555", marginTop: 2 },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docMeta: { fontSize: 9, color: "#555", marginTop: 2, textAlign: "right" },
  resumen: { fontSize: 9.5, color: "#333", marginBottom: 12 },
  th: { flexDirection: "row", backgroundColor: "#f2f2f2", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#ddd", paddingVertical: 5, paddingHorizontal: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee", paddingVertical: 4, paddingHorizontal: 6 },
  trFalta: { backgroundColor: "#fef2f2" },
  thTxt: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#555", textTransform: "uppercase" },
  cProd: { width: "34%" },
  cNum: { width: "16.5%", textAlign: "right" },
  td: { fontSize: 9 },
  tdFalta: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#b91c1c" },
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center",
    fontSize: 8, color: "#aaa", borderTopWidth: 0.5, borderTopColor: "#eee", paddingTop: 6,
  },
});

export function ReposicionPDF({ data, empresa }: { data: Reposicion; empresa: Empresa }) {
  const totalFalta = data.rows.reduce((a, r) => a + r.faltaProducir, 0);
  return (
    <Document title={`Reposición de stock - ${empresa.nombre}`} author={empresa.nombre}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.empresaNombre}>{empresa.nombre}</Text>
            {empresa.cuit ? <Text style={styles.empresaInfo}>CUIT: {empresa.cuit}</Text> : null}
          </View>
          <View>
            <Text style={styles.docTitle}>REPOSICIÓN DE STOCK</Text>
            <Text style={styles.docMeta}>Cobertura objetivo: 1 mes de venta</Text>
            <Text style={styles.docMeta}>
              Ventas {formatDate(data.desde)} — {formatDate(data.hasta)} ({data.meses}{" "}
              {data.meses === 1 ? "mes" : "meses"})
            </Text>
          </View>
        </View>

        <Text style={styles.resumen}>
          {data.totalFaltaItems} productos por debajo de 1 mes de cobertura. La demanda mensual es el
          promedio vendido en el período.
        </Text>

        <View style={styles.th}>
          <Text style={[styles.thTxt, styles.cProd]}>Producto</Text>
          <Text style={[styles.thTxt, styles.cNum]}>Stock</Text>
          <Text style={[styles.thTxt, styles.cNum]}>Venta/mes</Text>
          <Text style={[styles.thTxt, styles.cNum]}>Cobertura</Text>
          <Text style={[styles.thTxt, styles.cNum]}>A producir</Text>
        </View>
        {data.rows.map((r) => (
          <View key={r.producto_id} style={[styles.tr, r.faltaProducir > 0 ? styles.trFalta : {}]} wrap={false}>
            <Text style={[styles.td, styles.cProd]}>{r.codigo ? `${r.codigo} · ` : ""}{r.nombre}</Text>
            <Text style={[styles.td, styles.cNum]}>{formatNumber(r.stock)}</Text>
            <Text style={[styles.td, styles.cNum]}>{formatNumber(Math.round(r.demandaMensual))}</Text>
            <Text style={[styles.td, styles.cNum]}>
              {r.coberturaMeses != null ? `${r.coberturaMeses.toFixed(1)} m` : "—"}
            </Text>
            <Text style={[r.faltaProducir > 0 ? styles.tdFalta : styles.td, styles.cNum]}>
              {r.faltaProducir > 0 ? formatNumber(Math.ceil(r.faltaProducir)) : "—"}
            </Text>
          </View>
        ))}

        <Text style={styles.footer} fixed>
          {empresa.nombre} — Reposición para cubrir 1 mes · A producir en total:{" "}
          {formatNumber(Math.ceil(totalFalta))} u. · generado el {formatDate(new Date())}.
        </Text>
      </Page>
    </Document>
  );
}
