-- =============================================================================
-- 0021_puntos_venta.sql
-- Puntos de venta fiscales (AFIP) por unidad. Cada comprobante (remito/factura)
-- se emite desde un punto de venta y la numeración es correlativa POR
-- (unidad, punto de venta, tipo). Formato de comprobante: 0001-00000001.
-- =============================================================================

create table puntos_venta (
  id         uuid primary key default gen_random_uuid(),
  unidad_id  uuid not null default current_unidad_id() references unidades (id),
  numero     integer not null,          -- 1, 2, 3 ... (se muestra como 0001)
  nombre     text,                       -- etiqueta opcional: "Casa central"
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index idx_pv_unidad_numero on puntos_venta (unidad_id, numero);
create index idx_pv_unidad on puntos_venta (unidad_id);

comment on table puntos_venta is 'Puntos de venta fiscales por unidad. La numeración de comprobantes es por PV.';

alter table puntos_venta enable row level security;
create policy "unidad_puntos_venta" on puntos_venta
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());

-- Un punto de venta por defecto (1) para cada unidad existente.
insert into puntos_venta (unidad_id, numero, nombre)
select id, 1, 'Casa central' from unidades
on conflict (unidad_id, numero) do nothing;

-- comprobantes: a qué punto de venta pertenecen.
alter table comprobantes add column punto_venta_id uuid references puntos_venta (id);

-- Backfill: los comprobantes existentes van al PV 1 de su unidad.
update comprobantes c
set punto_venta_id = pv.id
from puntos_venta pv
where pv.unidad_id = c.unidad_id and pv.numero = 1 and c.punto_venta_id is null;

alter table comprobantes alter column punto_venta_id set not null;

-- La numeración pasa a ser única por (unidad, punto de venta, tipo).
drop index if exists idx_comprobantes_tipo_numero;
create unique index idx_comprobantes_pv_tipo_numero
  on comprobantes (unidad_id, punto_venta_id, tipo, numero);
