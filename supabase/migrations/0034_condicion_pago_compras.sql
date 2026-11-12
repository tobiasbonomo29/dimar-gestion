-- =============================================================================
-- 0034_condicion_pago_compras.sql
-- Condicion de pago en las compras de insumos y en las facturas de compra:
-- contado, contra entrega, a X dias (15/30/60/90...) o a una fecha puntual.
--
-- Ademas conecta los dos modulos: una compra de insumos que NO es contado
-- genera su factura en Cuentas a pagar, asi aparece en el calendario de pagos
-- sin tener que cargarla dos veces. El vinculo va en compras.factura_compra_id.
--
-- Nota: facturas_compra sigue siendo registro de DEUDA; el impacto en el estado
-- de resultados lo sigue dando el egreso que crea la compra (no se duplica).
-- =============================================================================

-- Como se paga: 'contado' (ya pagado, no genera deuda), 'contra_entrega'
-- (vence el dia de la entrega), 'dias' (vence a dias_pago de la fecha) y
-- 'fecha' (vencimiento cargado a mano).
create type condicion_pago_compra as enum ('contado', 'contra_entrega', 'dias', 'fecha');

-- -----------------------------------------------------------------------------
-- Compras de insumos
-- -----------------------------------------------------------------------------
alter table compras
  add column if not exists condicion_pago condicion_pago_compra not null default 'contado',
  add column if not exists dias_pago integer
    check (dias_pago is null or dias_pago >= 0),
  add column if not exists vencimiento date,
  add column if not exists factura_compra_id uuid
    references facturas_compra (id) on delete set null;

comment on column compras.condicion_pago is 'Como se paga la compra. Distinto de contado genera la factura en Cuentas a pagar.';
comment on column compras.dias_pago is 'Dias de plazo cuando condicion_pago = dias (ej. 30, 60, 90).';
comment on column compras.vencimiento is 'Fecha de vencimiento calculada al guardar. NULL en compras de contado.';
comment on column compras.factura_compra_id is 'Factura generada en Cuentas a pagar para esta compra (si va a plazo).';

create index if not exists idx_compras_vencimiento on compras (vencimiento);

-- -----------------------------------------------------------------------------
-- Facturas de compra (Cuentas a pagar): mismos campos para poder mostrar
-- "30 dias" en vez de solo la fecha, y para recalcular si cambia la fecha.
-- Las facturas ya cargadas quedan como 'fecha' (tienen vencimiento propio).
-- -----------------------------------------------------------------------------
alter table facturas_compra
  add column if not exists condicion_pago condicion_pago_compra not null default 'fecha',
  add column if not exists dias_pago integer
    check (dias_pago is null or dias_pago >= 0);

comment on column facturas_compra.condicion_pago is 'Condicion pactada; define como se calculo el vencimiento.';
