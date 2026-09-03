-- =============================================================================
-- 0029_entregas_parciales.sql
-- Entregas parciales de pedidos: cada ítem lleva cuánto se entregó (acumulado)
-- y se guarda el historial de entregas. El pendiente de un ítem pasa a ser
-- cantidad - cantidad_entregada.
-- =============================================================================

alter table pedido_items
  add column if not exists cantidad_entregada numeric(14,2) not null default 0
    check (cantidad_entregada >= 0);

comment on column pedido_items.cantidad_entregada is
  'Unidades ya entregadas de este ítem (acumulado). Pendiente = cantidad - cantidad_entregada.';

-- Historial de entregas (una por evento de entrega parcial o total).
create table entregas (
  id         uuid primary key default gen_random_uuid(),
  unidad_id  uuid not null default current_unidad_id() references unidades (id),
  pedido_id  uuid not null references pedidos (id) on delete cascade,
  fecha      date not null default current_date,
  nota       text,
  created_at timestamptz not null default now()
);
create index idx_entregas_pedido on entregas (pedido_id);

alter table entregas enable row level security;
create policy "unidad_entregas" on entregas
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());

create table entrega_items (
  id             uuid primary key default gen_random_uuid(),
  entrega_id     uuid not null references entregas (id) on delete cascade,
  pedido_item_id uuid not null references pedido_items (id) on delete cascade,
  descripcion    text not null,                       -- snapshot del ítem
  cantidad       numeric(14,2) not null check (cantidad > 0),
  created_at     timestamptz not null default now()
);
create index idx_entrega_items_entrega on entrega_items (entrega_id);

alter table entrega_items enable row level security;
create policy "unidad_entrega_items" on entrega_items
  for all to authenticated
  using (exists (select 1 from entregas e where e.id = entrega_items.entrega_id and e.unidad_id = current_unidad_id()))
  with check (exists (select 1 from entregas e where e.id = entrega_items.entrega_id and e.unidad_id = current_unidad_id()));
