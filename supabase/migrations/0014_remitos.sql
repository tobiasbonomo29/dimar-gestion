-- =============================================================================
-- 0014_remitos.sql
-- Remitos "sueltos" (no vinculados a un pedido): documentan mercadería que
-- Dimar envía a un destinatario cargado a mano. No tocan stock ni cuenta
-- corriente; son solo el comprobante de envío. Numeración correlativa propia,
-- independiente de la de comprobantes de pedidos.
-- =============================================================================

create table remitos (
  id                      uuid primary key default gen_random_uuid(),
  numero                  bigint generated always as identity,  -- correlativo legible
  fecha                   date not null default current_date,
  destinatario            text not null,                         -- razón social / nombre a mano
  destinatario_direccion  text,
  destinatario_cuit       text,
  notas                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table remitos is 'Remitos sueltos de envío de mercadería (no vinculados a un pedido, no fiscales).';
comment on column remitos.numero is 'Número correlativo legible del remito.';

create unique index idx_remitos_numero on remitos (numero);
create index idx_remitos_fecha on remitos (fecha desc);

-- Renglones de mercadería del remito. Solo descripción + cantidad (+ unidad);
-- sin precios. producto_id es opcional (link al catálogo si se eligió uno).
create table remito_items (
  id           uuid primary key default gen_random_uuid(),
  remito_id    uuid not null references remitos (id) on delete cascade,
  producto_id  uuid references productos (id) on delete set null,
  descripcion  text not null,                                    -- snapshot de la mercadería
  cantidad     numeric(14,2) not null check (cantidad > 0),
  unidad       text,                                             -- ej: unidad, bulto, caja
  created_at   timestamptz not null default now()
);

create index idx_remito_items_remito on remito_items (remito_id);

-- updated_at automático (reusa la función de 0002).
create trigger trg_remitos_updated_at
  before update on remitos
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: acceso total para usuarios autenticados (igual que el resto de tablas).
-- -----------------------------------------------------------------------------
alter table remitos       enable row level security;
alter table remito_items  enable row level security;

create policy "auth full access remitos"
  on remitos for all to authenticated
  using (true) with check (true);

create policy "auth full access remito_items"
  on remito_items for all to authenticated
  using (true) with check (true);
