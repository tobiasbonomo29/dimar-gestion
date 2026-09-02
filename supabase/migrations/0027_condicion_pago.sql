-- =============================================================================
-- 0027_condicion_pago.sql
-- Condición de pago por cliente + vencimiento de factura.
--  - clientes.condicion_pago_dias: plazo en días (0 = contado, 30, 60, ...).
--  - pedidos.fecha_vencimiento: vencimiento explícito opcional; si es null, se
--    deriva de fecha_creacion + condicion_pago_dias del cliente (en la query).
-- Permite mostrar en "Por cobrar" qué facturas están vencidas o por vencer.
-- =============================================================================

alter table clientes
  add column if not exists condicion_pago_dias integer not null default 0
    check (condicion_pago_dias >= 0 and condicion_pago_dias <= 365);

comment on column clientes.condicion_pago_dias is
  'Plazo de pago en días (0 = contado). Define el vencimiento de las facturas del cliente.';

alter table pedidos
  add column if not exists fecha_vencimiento date;

comment on column pedidos.fecha_vencimiento is
  'Vencimiento explícito de la factura; si es null se deriva de fecha_creacion + condicion_pago_dias del cliente.';
