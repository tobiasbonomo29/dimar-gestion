import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { CONDICIONES_FISCALES, ESTADOS_PEDIDO } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Empresa } from "@/features/unidades/queries";
import type { PedidoDetalle } from "../queries";

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 40,
    paddingVertical: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 12,
    marginBottom: 16,
  },
  empresaNombre: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  empresaInfo: { fontSize: 9, color: "#555", marginTop: 2 },
  docTitleBox: { alignItems: "flex-end" },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  docMeta: { fontSize: 9, color: "#555", marginTop: 2 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  block: { width: "48%" },
  blockLabel: {
    fontSize: 8,
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 3,
    fontFamily: "Helvetica-Bold",
  },
  blockLine: { fontSize: 9.5, marginBottom: 1.5 },
  table: { marginTop: 4, borderWidth: 1, borderColor: "#ddd" },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
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
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    marginTop: 4,
    paddingTop: 4,
  },
  totalFinalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  totalFinalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  notasBox: { marginTop: 20 },
  condiciones: {
    marginTop: 24,
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 10,
  },
  small: { fontSize: 8, color: "#888" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#aaa",
    borderTopWidth: 0.5,
    borderTopColor: "#eee",
    paddingTop: 6,
  },
});

export function CotizacionPDF({
  pedido,
  empresa,
}: {
  pedido: PedidoDetalle;
  empresa: Empresa;
}) {
  const cliente = pedido.clientes;

  return (
    <Document
      title={`Cotización #${pedido.numero} - ${empresa.nombre}`}
      author={empresa.nombre}
    >
      <Page size="A4" style={styles.page}>
        {/* Membrete */}
        <View style={styles.header}>
          <View>
            <Text style={styles.empresaNombre}>{empresa.nombre}</Text>
            {empresa.cuit ? <Text style={styles.empresaInfo}>CUIT: {empresa.cuit}</Text> : null}
            {empresa.direccion ? <Text style={styles.empresaInfo}>{empresa.direccion}</Text> : null}
            {(empresa.email || empresa.telefono) ? (
              <Text style={styles.empresaInfo}>
                {[empresa.email, empresa.telefono].filter(Boolean).join("  ·  ")}
              </Text>
            ) : null}
          </View>
          <View style={styles.docTitleBox}>
            <Text style={styles.docTitle}>COTIZACIÓN</Text>
            <Text style={styles.docMeta}>N° {String(pedido.numero).padStart(4, "0")}</Text>
            <Text style={styles.docMeta}>Fecha: {formatDate(pedido.fecha_creacion)}</Text>
            {pedido.fecha_estimada_entrega ? (
              <Text style={styles.docMeta}>
                Entrega est.: {formatDate(pedido.fecha_estimada_entrega)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Cliente + estado */}
        <View style={styles.sectionRow}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Cliente</Text>
            <Text style={[styles.blockLine, { fontFamily: "Helvetica-Bold" }]}>
              {cliente?.razon_social ?? "—"}
            </Text>
            {cliente?.nombre_contacto ? (
              <Text style={styles.blockLine}>{cliente.nombre_contacto}</Text>
            ) : null}
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
          <View style={[styles.block, { alignItems: "flex-end" }]}>
            <Text style={styles.blockLabel}>Estado</Text>
            <Text style={styles.blockLine}>{ESTADOS_PEDIDO[pedido.estado].label}</Text>
          </View>
        </View>

        {/* Ítems */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
            <Text style={[styles.th, styles.colCant]}>Cantidad</Text>
            <Text style={[styles.th, styles.colPrecio]}>Precio unit.</Text>
            <Text style={[styles.th, styles.colSubtotal]}>Subtotal</Text>
          </View>
          {pedido.pedido_items.map((it) => (
            <View style={styles.tableRow} key={it.id} wrap={false}>
              <Text style={[styles.td, styles.colDesc]}>{it.descripcion}</Text>
              <Text style={[styles.td, styles.colCant]}>{it.cantidad}</Text>
              <Text style={[styles.td, styles.colPrecio]}>{formatCurrency(it.precio_unitario)}</Text>
              <Text style={[styles.td, styles.colSubtotal]}>{formatCurrency(it.subtotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totales */}
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

        {/* Notas */}
        {pedido.notas ? (
          <View style={styles.notasBox}>
            <Text style={styles.blockLabel}>Notas</Text>
            <Text style={styles.blockLine}>{pedido.notas}</Text>
          </View>
        ) : null}

        {/* Condiciones */}
        <View style={styles.condiciones}>
          <Text style={styles.blockLabel}>Condiciones</Text>
          <Text style={styles.small}>· Precios expresados en pesos argentinos (ARS), IVA incluido según se detalla.</Text>
          <Text style={styles.small}>· Cotización válida por 15 días corridos desde la fecha de emisión.</Text>
          <Text style={styles.small}>· Los plazos de entrega se confirman al momento de aceptar el pedido.</Text>
        </View>

        <Text style={styles.footer} fixed>
          {empresa.nombre} — Cotización generada el {formatDate(new Date())}. Este documento no es una factura.
        </Text>
      </Page>
    </Document>
  );
}
