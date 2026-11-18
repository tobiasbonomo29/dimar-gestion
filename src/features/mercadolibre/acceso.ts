/**
 * Unidades de negocio que usan la integración con Mercado Libre.
 * Por ahora solo Distribuidora DSG (cuenta distribuidoradsg32); el resto no ve
 * la sección en el menú ni puede entrar a la página o vincular una cuenta.
 */
export const UNIDADES_MERCADOLIBRE: readonly string[] = [
  "9ebecd85-425c-4968-8314-19d48b827d65", // Distribuidora DSG
];

export function tieneMercadoLibre(unidadId: string | null | undefined): boolean {
  return Boolean(unidadId) && UNIDADES_MERCADOLIBRE.includes(unidadId as string);
}
