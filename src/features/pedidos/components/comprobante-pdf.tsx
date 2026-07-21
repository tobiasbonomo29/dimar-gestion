import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { EMPRESA, CONDICIONES_FISCALES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Comprobante, TipoComprobante } from "@/types/database";
import type { PedidoDetalle } from "../queries";

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
  table: { marginTop: 4, borderWidth: 1, borderColor: "#ddd" },
  tableHead: { flexDirection: "row", backgroundColor: "#f2f2f2", borderBottomWidth: 1, borderBottomColor: "#ddd" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  th: { fontSize: 8.5, fontFamily: "Helvetica-Bold", padding: 6, color: "#333" },
  td: { fontSize: 9, padding: 6 },
  colDesc: { width: "46%" },
  colCant: { width: "14%", textAlign: "right" },
  colPrecio: { width: "20%", textAlign: "right" },
  colSubtotal: { width: "20%", textAlign: "right" },
  totalsBox: { marginTop: 12, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", width: 220, justifyContent: "space-between", paddingVertical: 2 },
  totalsLabel: { fontSize: 9.5, color: "#555" },
  totalsValue: { fontSize: 9.5, textAlign: "right" },
  totalFinalRow: {
    flexDirection: "row", width: 220, justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "#1a1a1a", marginTop: 4, paddingTop: 4,
  },
  totalFinalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  totalFinalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  firma: { marginTop: 48, flexDirection: "row", justifyContent: "space-between" },
  firmaBox: { width: "45%", borderTopWidth: 0.5, borderTopColor: "#888", paddingTop: 4, alignItems: "center" },
  firmaText: { fontSize: 8, color: "#888" },
  footer: {
    position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center",
    fontSize: 8, color: "#aaa", borderTopWidth: 0.5, borderTopColor: "#eee", paddingTop: 6,
  },
});

const TITULOS: Record<TipoComprobante, string> = { remito: "REMITO", factura: "FACTURA" };

export function ComprobantePDF({
  pedido,
  comprobante,
}: {
  pedido: PedidoDetalle;
  comprobante: Comprobante;
}) {
  const cliente = pedido.clientes;
  const esFactura = comprobante.tipo === "factura";

  return (
    <Document title={`${TITULOS[comprobante.tipo]} N°${comprobante.numero} - ${EMPRESA.nombre}`} author={EMPRESA.nombre}>
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
            <Text style={styles.docTitle}>{TITULOS[comprobante.tipo]}</Text>
            <Text style={styles.docMeta}>N° {String(comprobante.numero).padStart(4, "0")}</Text>
            <Text style={styles.docMeta}>Fecha: {formatDate(comprobante.fecha)}</Text>
            <Text style={styles.docMeta}>Pedido #{pedido.numero}</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Cliente</Text>
            <Text style={[styles.blockLine, { fontFamily: "Helvetica-Bold" }]}>
              {cliente?.razon_social ?? "—"}
            </Text>
            {cliente?.nombre_contacto ? <Text style={styles.blockLine}>{cliente.nombre_contacto}</Text> : null}
            {cliente?.email ? <Text style={styles.blockLine}>{cliente.email}</Text> : null}
            {cliente?.telefono ? <Text style={styles.blockLine}>{cliente.telefono}</Text> : null}
            {cliente ? (
              <Text style={styles.blockLine}>
                {CONDICIONES_FISCALES[cliente.condicion_fiscal]}
                {cliente.cuit ? ` · CUIT ${cliente.cuit}` : ""}
              </Text>
            ) : null}
            {cliente?.direccion ? <Text style={styles.blockLine}>{cliente.direccion}</Text> : null}
          </View>
        </View>

        {/* Ítems */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
            <Text style={[styles.th, styles.colCant]}>Cantidad</Text>
            {esFactura ? <Text style={[styles.th, styles.colPrecio]}>Precio unit.</Text> : null}
            {esFactura ? <Text style={[styles.th, styles.colSubtotal]}>Subtotal</Text> : null}
          </View>
          {pedido.pedido_items.map((it) => (
            <View style={styles.tableRow} key={it.id} wrap={false}>
              <Text style={[styles.td, esFactura ? styles.colDesc : { width: "80%", padding: 6, fontSize: 9 }]}>
                {it.descripcion}
              </Text>
              <Text style={[styles.td, esFactura ? styles.colCant : { width: "20%", padding: 6, fontSize: 9, textAlign: "right" }]}>
                {it.cantidad}
              </Text>
              {esFactura ? <Text style={[styles.td, styles.colPrecio]}>{formatCurrency(it.precio_unitario)}</Text> : null}
              {esFactura ? <Text style={[styles.td, styles.colSubtotal]}>{formatCurrency(it.subtotal)}</Text> : null}
            </View>
          ))}
        </View>

        {/* Totales solo en factura */}
        {esFactura ? (
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Neto</Text>
              <Text style={styles.totalsValue}>{formatCurrency(pedido.subtotal)}</Text>
            </View>
            {pedido.descuento_monto > 0 ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Descuento ({pedido.descuento_porcentaje}%)</Text>
                <Text style={styles.totalsValue}>-{formatCurrency(pedido.descuento_monto)}</Text>
              </View>
            ) : null}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IVA ({pedido.iva_porcentaje}%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(pedido.iva_monto)}</Text>
            </View>
            <View style={styles.totalFinalRow}>
              <Text style={styles.totalFinalLabel}>TOTAL</Text>
              <Text style={styles.totalFinalValue}>{formatCurrency(pedido.total)}</Text>
            </View>
          </View>
        ) : null}

        {/* Firmas en el remito */}
        {!esFactura ? (
          <View style={styles.firma}>
            <View style={styles.firmaBox}><Text style={styles.firmaText}>Entregó</Text></View>
            <View style={styles.firmaBox}><Text style={styles.firmaText}>Recibió (aclaración y firma)</Text></View>
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          {EMPRESA.nombre} — {TITULOS[comprobante.tipo]} interno generado el {formatDate(comprobante.fecha)}.
          {" "}Documento no válido como factura fiscal (AFIP).
        </Text>
      </Page>
    </Document>
  );
}
