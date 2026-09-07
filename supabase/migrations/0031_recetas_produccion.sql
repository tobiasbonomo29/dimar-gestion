-- =============================================================================
-- 0031_recetas_produccion.sql
-- Recetas (BOM) por producto + producción.
--  - receta_items: cuánto consume un producto de cada insumo, POR UNIDAD.
--  - producciones / produccion_items: registro de cada producción. Al producir
--    se descuenta la materia prima (snapshot en produccion_items) y sube el
--    stock del producto terminado.
-- Multi-unidad: unidad_id con default current_unidad_id() + RLS por unidad.
-- =============================================================================

create table receta_items (
  id           uuid primary key default gen_random_uuid(),
  unidad_id    uuid not null default current_unidad_id() references unidades (id),
  producto_id  uuid not null references productos (id) on delete cascade,
  insumo_id    uuid not null references insumos (id) on delete cascade,
  cantidad     numeric(18,6) not null check (cantidad >= 0),  -- consumo por UNIDAD de producto
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index idx_receta_prod_insumo on receta_items (producto_id, insumo_id);
create index idx_receta_producto on receta_items (producto_id);
create index idx_receta_unidad on receta_items (unidad_id);

create trigger trg_receta_items_updated_at
  before update on receta_items
  for each row execute function set_updated_at();

alter table receta_items enable row level security;
create policy "unidad_receta_items" on receta_items
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());

-- -----------------------------------------------------------------------------
-- Producciones
-- -----------------------------------------------------------------------------
create table producciones (
  id           uuid primary key default gen_random_uuid(),
  unidad_id    uuid not null default current_unidad_id() references unidades (id),
  producto_id  uuid not null references productos (id) on delete restrict,
  cantidad     numeric(14,2) not null check (cantidad > 0),  -- unidades producidas
  fecha        date not null default current_date,
  nota         text,
  created_at   timestamptz not null default now()
);
create index idx_producciones_unidad on producciones (unidad_id);
create index idx_producciones_producto on producciones (producto_id);
create index idx_producciones_fecha on producciones (fecha desc);

alter table producciones enable row level security;
create policy "unidad_producciones" on producciones
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());

-- Snapshot de la materia prima consumida (para historial y reversa correcta).
create table produccion_items (
  id             uuid primary key default gen_random_uuid(),
  produccion_id  uuid not null references producciones (id) on delete cascade,
  insumo_id      uuid references insumos (id) on delete set null,
  descripcion    text not null,
  cantidad       numeric(18,6) not null check (cantidad >= 0),  -- total consumido
  created_at     timestamptz not null default now()
);
create index idx_produccion_items_prod on produccion_items (produccion_id);

alter table produccion_items enable row level security;
create policy "unidad_produccion_items" on produccion_items
  for all to authenticated
  using (exists (select 1 from producciones p where p.id = produccion_items.produccion_id and p.unidad_id = current_unidad_id()))
  with check (exists (select 1 from producciones p where p.id = produccion_items.produccion_id and p.unidad_id = current_unidad_id()));
