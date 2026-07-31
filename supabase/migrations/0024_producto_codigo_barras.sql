-- =============================================================================
-- 0024_producto_codigo_barras.sql
-- Código de barras (EAN/GTIN) en los productos propios, para poder pickearlos
-- con lector de barras al cargar un pedido. (Los medicamentos ya lo traen de
-- Alfabeta.)
-- =============================================================================

alter table productos add column if not exists codigo_barras text;

create index if not exists idx_productos_codigo_barras
  on productos (unidad_id, codigo_barras);

comment on column productos.codigo_barras is 'Código de barras (EAN/GTIN) del producto, para lectura con escáner.';
