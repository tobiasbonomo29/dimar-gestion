-- =============================================================================
-- 0029_codigo_producto_por_unidad.sql
-- El código de producto era único en toda la base (0009), lo que impedía que
-- dos unidades de negocio usaran el mismo código (ej. TB1). Pasa a ser único
-- dentro de cada unidad.
-- =============================================================================

drop index if exists idx_productos_codigo;

create unique index if not exists idx_productos_unidad_codigo
  on productos (unidad_id, codigo);
