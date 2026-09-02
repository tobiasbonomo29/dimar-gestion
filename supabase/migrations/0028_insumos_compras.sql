-- =============================================================================
-- 0028_insumos_compras.sql
-- Bloque 3: Inventario de insumos / materia prima (stock por presentación) +
-- módulo de Compras entrecruzado (una compra suma stock del insumo).
-- Multi-unidad: unidad_id con default current_unidad_id() + RLS por unidad.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- INSUMOS (materia prima / insumos). Cada fila es un insumo en una presentación
-- concreta, con su propio stock.
-- -----------------------------------------------------------------------------
create table insumos (
  id            uuid primary key default gen_random_uuid(),
  unidad_id     uuid not null default current_unidad_id() references unidades (id),
  nombre        text not null,
  presentacion  text,                                  -- ej: "Rollo 500m", "Caja x12"
  unidad_medida text not null default 'unidad',
  categoria     text,
  stock         numeric(14,2) not null default 0,
  stock_minimo  numeric(14,2) not null default 0,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_insumos_unidad on insumos (unidad_id);
comment on table insumos is 'Insumos / materia prima, stockeados por presentación. Se reponen desde Compras.';

create trigger trg_insumos_updated_at
  before update on insumos
  for each row execute function set_updated_at();

alter table insumos enable row level security;
create policy "unidad_insumos" on insumos
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());

-- -----------------------------------------------------------------------------
-- COMPRAS (de insumos) + ítems. Al guardar una compra, la app suma el stock de
-- cada insumo y crea un egreso (tipo compra) para el estado de resultados.
-- -----------------------------------------------------------------------------
create table compras (
  id          uuid primary key default gen_random_uuid(),
  unidad_id   uuid not null default current_unidad_id() references unidades (id),
  numero      bigint generated always as identity,
  fecha       date not null default current_date,
  proveedor   text,
  medio_pago  medio_pago not null default 'transferencia',
  total       numeric(14,2) not null default 0 check (total >= 0),
  nota        text,
  egreso_id   uuid references egresos (id) on delete set null,   -- egreso financiero vinculado
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_compras_unidad on compras (unidad_id);
create index idx_compras_fecha on compras (fecha desc);

create trigger trg_compras_updated_at
  before update on compras
  for each row execute function set_updated_at();

alter table compras enable row level security;
create policy "unidad_compras" on compras
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());

create table compra_items (
  id              uuid primary key default gen_random_uuid(),
  compra_id       uuid not null references compras (id) on delete cascade,
  insumo_id       uuid references insumos (id) on delete set null,
  descripcion     text not null,                       -- snapshot del insumo
  cantidad        numeric(14,2) not null check (cantidad > 0),
  precio_unitario numeric(14,2) not null default 0 check (precio_unitario >= 0),
  subtotal        numeric(14,2) not null generated always as (cantidad * precio_unitario) stored,
  created_at      timestamptz not null default now()
);
create index idx_compra_items_compra on compra_items (compra_id);
create index idx_compra_items_insumo on compra_items (insumo_id);

alter table compra_items enable row level security;
create policy "unidad_compra_items" on compra_items
  for all to authenticated
  using (exists (select 1 from compras c where c.id = compra_items.compra_id and c.unidad_id = current_unidad_id()))
  with check (exists (select 1 from compras c where c.id = compra_items.compra_id and c.unidad_id = current_unidad_id()));
