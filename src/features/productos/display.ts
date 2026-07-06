import type { ProductoConVariantes } from "./queries";

const DESCRIPCIONES_POR_CODIGO: Record<string, string> = {
  TB1: "Bolsa TB1 20x28",
  TB2: "Bolsa TB2 20x35",
  TB3: "Bolsa TB3 30x35",
};

export function getProductoNombre(producto: ProductoConVariantes) {
  return producto.codigo
    ? DESCRIPCIONES_POR_CODIGO[producto.codigo] ?? producto.nombre
    : producto.nombre;
}
