-- =============================================================================
-- 0036_clientes_internos.sql
-- Clientes internos: pedidos que NO suman a la facturacion.
--
-- Caso Valmax: es mercaderia que la fabrica le envia al otro dueno del negocio.
-- Se sigue cargando como pedido (descuenta stock, tiene cuenta corriente y
-- pagos), pero no cuenta como venta: queda fuera del estado de resultados, la
-- facturacion, las comisiones de vendedores y el reporte gerencial (salvo su
-- propia solapa "Envios a Valmax", que lleva la contabilidad aparte).
-- =============================================================================

alter table clientes
  add column excluir_facturacion boolean not null default false;

comment on column clientes.excluir_facturacion is
  'Cliente interno (ej. Valmax): sus pedidos no suman a la facturacion ni a las ventas, pero mantienen cuenta corriente.';

update clientes set excluir_facturacion = true where razon_social ilike '%valmax%';
