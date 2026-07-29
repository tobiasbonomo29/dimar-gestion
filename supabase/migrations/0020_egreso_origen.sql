-- =============================================================================
-- 0020_egreso_origen.sql
-- Origen del dinero en cada egreso: de dónde salió la plata para pagarlo.
--   'banco'    = cuenta bancaria (Credicoop)
--   'efectivo' = caja chica
--   'terceros' = lo pagó un tercero por fuera (ej. Ramiro, una farmacia)
-- Permite filtrar los gastos por origen en Administración.
-- =============================================================================

alter table egresos add column if not exists origen text;

comment on column egresos.origen is 'Origen del dinero del egreso: banco, efectivo (caja chica) o terceros.';
