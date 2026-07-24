-- =============================================================================
-- 0019_categorias.sql
-- Categorías de producto dinámicas (antes eran un enum fijo). Cada unidad de
-- negocio maneja su propia lista de categorías y puede crear nuevas al vuelo.
--
--  1) Tabla `categorias` (por unidad, con RLS igual que el resto).
--  2) productos.categoria pasa de enum `categoria_producto` a texto libre, con
--     el nombre legible de la categoría.
--  3) Se siembran las categorías actuales de cada unidad a partir de sus productos.
-- =============================================================================

-- 1) Tabla de categorías (multi-unidad) --------------------------------------
create table categorias (
  id         uuid primary key default gen_random_uuid(),
  unidad_id  uuid not null default current_unidad_id() references unidades (id),
  nombre     text not null,
  created_at timestamptz not null default now()
);

create unique index idx_categorias_unidad_nombre on categorias (unidad_id, nombre);
create index idx_categorias_unidad on categorias (unidad_id);

alter table categorias enable row level security;

create policy "unidad_categorias" on categorias
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());

-- 2) productos.categoria: enum -> texto ---------------------------------------
alter table productos alter column categoria type text using categoria::text;

-- Nombres legibles para las 3 categorías que existían como enum.
update productos set categoria = 'Gel refrigerante' where categoria = 'gel_refrigerante';
update productos set categoria = 'Sachet'           where categoria = 'sachet';
update productos set categoria = 'Bolsa'            where categoria = 'bolsa';

-- El enum ya no se usa en ninguna columna: se elimina.
drop type if exists categoria_producto;

-- 3) Sembrar categorías actuales por unidad -----------------------------------
insert into categorias (unidad_id, nombre)
select distinct unidad_id, categoria
from productos
where categoria is not null and categoria <> ''
on conflict (unidad_id, nombre) do nothing;
