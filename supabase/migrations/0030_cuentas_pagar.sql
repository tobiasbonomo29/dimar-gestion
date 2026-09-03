-- =============================================================================
-- 0030_cuentas_pagar.sql
-- Cuentas a pagar: facturas de compra de proveedores con sus pagos, para saber
-- cuánto se debe y a quién (con vencimientos). Es un registro de deuda a
-- proveedores, independiente del estado de resultados (no duplica los egresos).
-- =============================================================================

create table facturas_compra (
  id           uuid primary key default gen_random_uuid(),
  unidad_id    uuid not null default current_unidad_id() references unidades (id),
  proveedor    text not null,
  numero       text,                                   -- N° de factura del proveedor
  fecha        date not null default current_date,
  vencimiento  date,
  monto        numeric(14,2) not null check (monto >= 0),
  nota         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_facturas_compra_unidad on facturas_compra (unidad_id);
create index idx_facturas_compra_venc on facturas_compra (vencimiento);

create trigger trg_facturas_compra_updated_at
  before update on facturas_compra
  for each row execute function set_updated_at();

alter table facturas_compra enable row level security;
create policy "unidad_facturas_compra" on facturas_compra
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());

create table pagos_compra (
  id                 uuid primary key default gen_random_uuid(),
  unidad_id          uuid not null default current_unidad_id() references unidades (id),
  factura_compra_id  uuid not null references facturas_compra (id) on delete cascade,
  monto              numeric(14,2) not null check (monto > 0),
  fecha              date not null default current_date,
  medio_pago         medio_pago not null default 'transferencia',
  nota               text,
  created_at         timestamptz not null default now()
);
create index idx_pagos_compra_factura on pagos_compra (factura_compra_id);
create index idx_pagos_compra_unidad on pagos_compra (unidad_id);

alter table pagos_compra enable row level security;
create policy "unidad_pagos_compra" on pagos_compra
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());
