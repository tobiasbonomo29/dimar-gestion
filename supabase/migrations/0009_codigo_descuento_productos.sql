-- =============================================================================
-- 0009_codigo_descuento_productos.sql
-- 1) Agrega `codigo` a productos (ej. RS2, TB1).
-- 2) Agrega descuento por pedido (% + monto) e integra el cálculo al trigger.
-- 3) Reemplaza los productos de ejemplo por el catálogo real de Dimar.
-- =============================================================================

-- 1) Código de producto -------------------------------------------------------
alter table productos add column if not exists codigo text;
create unique index if not exists idx_productos_codigo on productos (codigo);
comment on column productos.codigo is 'Código interno del producto (ej. RS2, TB1).';

-- 2) Descuento por pedido -----------------------------------------------------
alter table pedidos
  add column if not exists descuento_porcentaje numeric(5,2) not null default 0
    check (descuento_porcentaje >= 0 and descuento_porcentaje <= 100),
  add column if not exists descuento_monto numeric(14,2) not null default 0
    check (descuento_monto >= 0);

comment on column pedidos.descuento_porcentaje is 'Descuento aplicado al pedido (ej. 10% chicos, hasta 20% grandes).';
comment on column pedidos.descuento_monto is 'Monto del descuento = subtotal * descuento_porcentaje / 100.';

-- El cálculo de totales ahora contempla el descuento antes del IVA:
--   descuento_monto = subtotal * descuento%/100
--   neto gravado    = subtotal - descuento_monto
--   iva_monto       = neto gravado * iva%/100
--   total           = neto gravado + iva_monto
create or replace function calcular_iva_pedido()
returns trigger
language plpgsql
as $$
declare
  neto_gravado numeric(14,2);
begin
  new.descuento_monto = round(new.subtotal * new.descuento_porcentaje / 100, 2);
  neto_gravado = new.subtotal - new.descuento_monto;
  new.iva_monto = round(neto_gravado * new.iva_porcentaje / 100, 2);
  new.total = neto_gravado + new.iva_monto;
  return new;
end;
$$;

-- 3) Catálogo real ------------------------------------------------------------
-- Elimina los productos de ejemplo (y sus variantes por cascade).
delete from productos
where nombre in ('Gel refrigerante estándar', 'Sachet de gel 200ml', 'Bolsa isotérmica chica');

insert into productos (codigo, categoria, nombre, unidad_medida, precio_base) values
  ('RS2',      'sachet',           'Sachet 100gr',      'unidad', 450.00),
  ('RS3',      'sachet',           'Sachet 150gr',      'unidad', 550.00),
  ('RS2 X 40', 'sachet',           'Sachet 100gr x40',  'pack',   13500.00),
  ('RS4',      'sachet',           'Sachet 300gr',      'unidad', 600.00),
  ('RS5',      'sachet',           'Sachet 600gr',      'unidad', 700.00),
  ('RS6',      'sachet',           'Sachet 800gr',      'unidad', 1150.00),
  ('RS7',      'sachet',           'Sachet 1000gr',     'unidad', 0.00),
  ('RG1',      'gel_refrigerante', 'Frasco 170ml',      'unidad', 0.00),
  ('RG2',      'gel_refrigerante', 'Frasco 500ml',      'unidad', 0.00),
  ('RG3',      'gel_refrigerante', 'Frasco 1000ml',     'unidad', 0.00),
  ('TB1',      'bolsa',            'Bolsa TB1',         'unidad', 294.00),
  ('TB2',      'bolsa',            'Bolsa TB2',         'unidad', 363.00),
  ('TB3',      'bolsa',            'Bolsa TB3',         'unidad', 523.00),
  ('TB1X20',   'bolsa',            'Bolsa TB1 x20',     'pack',   0.00)
on conflict (codigo) do nothing;
