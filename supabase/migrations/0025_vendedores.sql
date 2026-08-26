-- =============================================================================
-- 0025_vendedores.sql
-- Vendedores y comisiones. Cada cliente tiene un vendedor "que lo trajo" y cada
-- pedido lleva su vendedor (por defecto el del cliente). A fin de mes se liquida
-- a cada vendedor un % (default 3%) de la venta sin impuestos de sus pedidos
-- facturados. Multi-unidad + RLS por unidad.
-- =============================================================================

create table vendedores (
  id                   uuid primary key default gen_random_uuid(),
  unidad_id            uuid not null default current_unidad_id() references unidades (id),
  nombre               text not null,
  comision_porcentaje  numeric(5,2) not null default 3
    check (comision_porcentaje >= 0 and comision_porcentaje <= 100),
  activo               boolean not null default true,
  created_at           timestamptz not null default now()
);

create index idx_vendedores_unidad on vendedores (unidad_id);

alter table vendedores enable row level security;
create policy "unidad_vendedores" on vendedores
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());

-- Vendedor del cliente (el que lo trajo) y del pedido (por defecto el del cliente).
alter table clientes add column vendedor_id uuid references vendedores (id) on delete set null;
alter table pedidos  add column vendedor_id uuid references vendedores (id) on delete set null;

create index idx_clientes_vendedor on clientes (vendedor_id);
create index idx_pedidos_vendedor on pedidos (vendedor_id);
