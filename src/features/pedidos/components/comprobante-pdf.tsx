import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { CONDICIONES_FISCALES } from "@/lib/constants";
import { formatCurrency, formatDate, formatComprobanteNumero } from "@/lib/format";
import { bultosTexto, resumenTexto, resumirBultos } from "@/lib/bultos";
import type { Comprobante, TipoComprobante } from "@/types/database";
import type { Empresa } from "@/features/unidades/queries";
import type { PedidoDetalle } from "../queries";
import { bultosDeItem } from "../bultos";

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
  // Factura con bultos
  colDescB: { width: "34%" },
  colCantB: { width: "11%", textAlign: "right" },
  colBultosB: { width: "19%", textAlign: "right" },
  colPrecioB: { width: "18%", textAlign: "right" },
  colSubtotalB: { width: "18%", textAlign: "right" },
  // Remito (sin precios)
  colDescR: { width: "80%" },
  colCantR: { width: "20%", textAlign: "right" },
  colDescRB: { width: "58%" },
  colCantRB: { width: "15%", textAlign: "right" },
  colBultosRB: { width: "27%", textAlign: "right" },
  bultosBox: {
    marginTop: 10, padding: 8, borderWidth: 1, borderColor: "#1a1a1a",
    alignSelf: "flex-start",
  },
  bultosText: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
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
  empresa,
  puntoVentaNumero,
}: {
  pedido: PedidoDetalle;
  comprobante: Comprobante;
  empresa: Empresa;
  puntoVentaNumero: number;
}) {
  const cliente = pedido.clientes;
  const esFactura = comprobante.tipo === "factura";
  const nroComprobante = formatComprobanteNumero(puntoVentaNumero, comprobante.numero);

  const bultos = pedido.pedido_items.map(bultosDeItem);
  // Si ningún renglón tiene dato de empaque (ej. pedido de medicamentos) no se
  // muestra la columna: sería una columna llena de guiones.
  const conBultos = bultos.some((b) => b !== null);
  const resumen = resumirBultos(bultos);

  const cols = esFactura
    ? conBultos
      ? { desc: styles.colDescB, cant: styles.colCantB, precio: styles.colPrecioB, subtotal: styles.colSubtotalB }
      : { desc: styles.colDesc, cant: styles.colCant, precio: styles.colPrecio, subtotal: styles.colSubtotal }
    : conBultos
      ? { desc: styles.colDescRB, cant: styles.colCantRB, precio: styles.colPrecio, subtotal: styles.colSubtotal }
      : { desc: styles.colDescR, cant: styles.colCantR, precio: styles.colPrecio, subtotal: styles.colSubtotal };
  const colBultos = esFactura ? styles.colBultosB : styles.colBultosRB;

  return (
    <Document title={`${TITULOS[comprobante.tipo]} ${nroComprobante} - ${empresa.nombre}`} author={empresa.nombre}>
      <Page size="A4" style={styles.page}>
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
            <Text style={styles.docTitle}>{TITULOS[comprobante.tipo]}</Text>
            <Text style={styles.docMeta}>N° {nroComprobante}</Text>
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
            <Text style={[styles.th, cols.desc]}>Descripción</Text>
            <Text style={[styles.th, cols.cant]}>Cantidad</Text>
            {conBultos ? <Text style={[styles.th, colBultos]}>Bultos</Text> : null}
            {esFactura ? <Text style={[styles.th, cols.precio]}>Precio unit.</Text> : null}
            {esFactura ? <Text style={[styles.th, cols.subtotal]}>Subtotal</Text> : null}
          </View>
          {pedido.pedido_items.map((it, i) => (
            <View style={styles.tableRow} key={it.id} wrap={false}>
              <Text style={[styles.td, cols.desc]}>{it.descripcion}</Text>
              <Text style={[styles.td, cols.cant]}>{it.cantidad}</Text>
              {conBultos ? (
                <Text style={[styles.td, colBultos]}>
                  {bultosTexto(bultos[i], it.productos?.tipo_bulto)}
                </Text>
              ) : null}
              {esFactura ? <Text style={[styles.td, cols.precio]}>{formatCurrency(it.precio_unitario)}</Text> : null}
              {esFactura ? <Text style={[styles.td, cols.subtotal]}>{formatCurrency(it.subtotal)}</Text> : null}
            </View>
          ))}
        </View>

        {conBultos ? (
          <View style={styles.bultosBox} wrap={false}>
            <Text style={styles.bultosText}>{resumenTexto(resumen)}</Text>
          </View>
        ) : null}

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
          {empresa.nombre} — {TITULOS[comprobante.tipo]} interno generado el {formatDate(comprobante.fecha)}.
          {" "}Documento no válido como factura fiscal (AFIP).
        </Text>
      </Page>
    </Document>
  );
}
