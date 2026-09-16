import { calcularBultos } from "@/lib/bultos";
import type { PedidoItemConEmpaque } from "./queries";

/**
 * Bultos de un renglón de pedido. La variante manda si tiene su propia cantidad
 * por bulto; si no, se usa la del producto. Sin producto (ej. medicamento) o
 * sin dato de empaque = null.
 */
export function bultosDeItem(it: PedidoItemConEmpaque) {
  const porBulto = it.producto_variantes?.cantidad_por_bulto ?? it.productos?.unidades_por_bulto;
  return calcularBultos(it.cantidad, porBulto);
}
