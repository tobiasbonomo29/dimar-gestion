-- =============================================================================
-- 0033_productos_bultos.sql
-- Empaque por producto: cuantas unidades entran en cada bulto (caja / bolsa).
-- Con esto las facturas y remitos calculan solos la cantidad de bultos de cada
-- renglon y el total a despachar.
--
-- Ya existia producto_variantes.cantidad_por_bulto, pero casi ningun producto
-- usa variantes. Este dato va a nivel producto; si un renglon de pedido tiene
-- variante con cantidad_por_bulto propia, esa tiene prioridad.
-- =============================================================================

alter table productos
  add column if not exists unidades_por_bulto integer
    check (unidades_por_bulto is null or unidades_por_bulto > 0),
  add column if not exists tipo_bulto text;   -- "Caja", "Bolsa"... (libre)

comment on column productos.unidades_por_bulto is 'Unidades que entran en un bulto. NULL = sin dato (no se calculan bultos).';
comment on column productos.tipo_bulto is 'Nombre del bulto para los comprobantes: Caja, Bolsa, etc.';

-- -----------------------------------------------------------------------------
-- Carga inicial de empaque de Dimar SRL.
--   Sachets RS: planilla "Costos Frio 03-2025" (CAJA V3 38x29.4x22.2 cm).
--   Bolsas TB: informado por el usuario (16/09/2026).
-- Se busca por codigo corto (RS2) o largo (FRS200001), o por el nombre como
-- palabra completa ("Sachet Refrigerante RS2"), solo en la unidad Dimar SRL.
-- -----------------------------------------------------------------------------
with empaque (cod, cod_largo, unidades, tipo) as (
  values
    ('RS2', 'FRS200001', 120, 'Caja'),
    ('RS3', 'FRS300001',  90, 'Caja'),
    ('RS4', 'FRS400001',  50, 'Caja'),
    ('RS5', 'FRS500001',  25, 'Caja'),
    ('RS6', 'FRS600001',  18, 'Caja'),
    ('RS7', 'FRS700001',  15, 'Caja'),
    ('TB1', 'TB1',       500, 'Bolsa'),
    ('TB2', 'TB2',       500, 'Bolsa'),
    ('TB3', 'TB3',       300, 'Bolsa')
)
update productos p
set unidades_por_bulto = e.unidades,
    tipo_bulto = e.tipo
from empaque e
where p.unidad_id = '11111111-1111-1111-1111-111111111111'  -- Dimar SRL
  and (
    upper(trim(p.codigo)) in (e.cod, e.cod_largo)
    or p.nombre ~* ('\m' || e.cod || '\M')
  );

-- Verificacion: que productos quedaron con empaque cargado.
select codigo, nombre, unidades_por_bulto, tipo_bulto
from productos
where unidad_id = '11111111-1111-1111-1111-111111111111'
order by unidades_por_bulto is null, codigo;
