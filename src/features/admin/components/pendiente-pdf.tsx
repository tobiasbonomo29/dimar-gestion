import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate, formatNumber } from "@/lib/format";
import { ESTADOS_PEDIDO } from "@/lib/constants";
import type { Empresa } from "@/features/unidades/queries";
import type { PendienteProducto } from "../queries";

const styles = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingVertical: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    borderBottomWidth: 1.5, borderBottomColor: "#1a1a1a", paddingBottom: 12, marginBottom: 16,
  },
  empresaNombre: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  empresaInfo: { fontSize: 9, color: "#555", marginTop: 2 },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docMeta: { fontSize: 9, color: "#555", marginTop: 2, textAlign: "right" },
  resumen: { fontSize: 9.5, color: "#333", marginBottom: 14 },
  prodBlock: { marginBottom: 12 },
  prodHead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
    backgroundColor: "#f2f2f2", paddingVertical: 5, paddingHorizontal: 8, borderRadius: 3,
  },
  prodNombre: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  prodTotal: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingVertical: 4, paddingHorizontal: 8, marginTop: 2 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee", paddingVertical: 3.5, paddingHorizontal: 8 },
  thTxt: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#666", textTransform: "uppercase" },
  cPedido: { width: "14%" },
  cCliente: { width: "44%" },
  cFecha: { width: "20%" },
  cEstado: { width: "12%" },
  cCant: { width: "10%", textAlign: "right" },
  td: { fontSize: 9 },
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center",
    fontSize: 8, color: "#aaa", borderTopWidth: 0.5, borderTopColor: "#eee", paddingTop: 6,
  },
});

export function PendientePDF({
  items,
  empresa,
}: {
  items: PendienteProducto[];
  empresa: Empresa;
}) {
  const totalPendiente = items.reduce((a, i) => a + i.pendiente, 0);

  return (
    <Document title={`Pendiente de producción - ${empresa.nombre}`} author={empresa.nombre}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.empresaNombre}>{empresa.nombre}</Text>
            {empresa.cuit ? <Text style={styles.empresaInfo}>CUIT: {empresa.cuit}</Text> : null}
          </View>
          <View>
            <Text style={styles.docTitle}>PENDIENTE DE PRODUCCIÓN</Text>
            <Text style={styles.docMeta}>Generado el {formatDate(new Date())}</Text>
          </View>
        </View>

        <Text style={styles.resumen}>
          {items.length} productos · {formatNumber(totalPendiente)} unidades pendientes de entrega
          (pedidos confirmados o facturados, sin despachar).
        </Text>

        {items.map((p) => (
          <View key={p.producto_id ?? p.descripcion} style={styles.prodBlock} wrap={false}>
            <View style={styles.prodHead}>
              <Text style={styles.prodNombre}>{p.descripcion}</Text>
              <Text style={styles.prodTotal}>Pendiente: {formatNumber(p.pendiente)} u.</Text>
            </View>
            <View style={styles.th}>
              <Text style={[styles.thTxt, styles.cPedido]}>Pedido</Text>
              <Text style={[styles.thTxt, styles.cCliente]}>Cliente</Text>
              <Text style={[styles.thTxt, styles.cFecha]}>Cargado</Text>
              <Text style={[styles.thTxt, styles.cEstado]}>Estado</Text>
              <Text style={[styles.thTxt, styles.cCant]}>Cant.</Text>
            </View>
            {p.detalle.map((d, i) => (
              <View style={styles.tr} key={`${d.pedido_id}-${i}`}>
                <Text style={[styles.td, styles.cPedido]}>#{d.numero}</Text>
                <Text style={[styles.td, styles.cCliente]}>{d.cliente}</Text>
                <Text style={[styles.td, styles.cFecha]}>{formatDate(d.fecha)}</Text>
                <Text style={[styles.td, styles.cEstado]}>{ESTADOS_PEDIDO[d.estado].label}</Text>
                <Text style={[styles.td, styles.cCant]}>{formatNumber(d.cantidad)}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.footer} fixed>
          {empresa.nombre} — Reporte de pendiente de producción generado el {formatDate(new Date())}.
        </Text>
      </Page>
    </Document>
  );
}
