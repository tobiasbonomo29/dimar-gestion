-- =============================================================================
-- 0017_egresos.sql
-- Administración: registro de COMPRAS y EROGACIONES (egresos). Las ventas del
-- estado de resultados se derivan de los pedidos facturados, así que acá solo
-- se cargan las salidas de dinero. Monto total simple (sin discriminar IVA).
-- Multi-unidad: unidad_id con default = unidad del usuario logueado + RLS por
-- unidad (misma mecánica que el resto de las tablas, ver 0016).
-- =============================================================================

create type tipo_egreso as enum ('compra', 'erogacion');

create table egresos (
  id          uuid primary key default gen_random_uuid(),
  unidad_id   uuid not null references unidades (id) default current_unidad_id(),
  tipo        tipo_egreso not null,
  fecha       date not null default current_date,
  concepto    text not null,
  proveedor   text,
  categoria   text,
  monto       numeric(14,2) not null check (monto >= 0),
  medio_pago  medio_pago not null default 'transferencia',
  nota        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table egresos is 'Compras y erogaciones (salidas de dinero) por unidad. Las ventas se derivan de pedidos facturados.';

create index idx_egresos_unidad on egresos (unidad_id);
create index idx_egresos_fecha on egresos (fecha desc);
create index idx_egresos_tipo on egresos (tipo);

create trigger trg_egresos_updated_at
  before update on egresos
  for each row execute function set_updated_at();

alter table egresos enable row level security;

create policy "unidad_egresos" on egresos
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());
