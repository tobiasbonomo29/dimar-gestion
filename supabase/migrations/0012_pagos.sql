-- =============================================================================
-- 0012_pagos.sql
-- Cuenta corriente de clientes: registro de pagos recibidos. La deuda no se
-- guarda como columna (se deriva): un pedido "genera deuda" cuando llega a
-- despachado/facturado (bienes entregados), y se salda con los pagos
-- registrados acá. Permite pago general (pedido_id null) o asociado a un
-- pedido puntual.
-- =============================================================================

create type medio_pago as enum (
  'efectivo',
  'transferencia',
  'cheque',
  'tarjeta',
  'otro'
);

create table pagos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes (id) on delete restrict,
  pedido_id   uuid references pedidos (id) on delete set null,
  monto       numeric(14,2) not null check (monto > 0),
  fecha       date not null default current_date,
  medio_pago  medio_pago not null default 'transferencia',
  nota        text,
  created_at  timestamptz not null default now()
);

create index idx_pagos_cliente on pagos (cliente_id);
create index idx_pagos_pedido on pagos (pedido_id);

comment on table pagos is 'Pagos recibidos de clientes, para calcular saldo de cuenta corriente.';

alter table pagos enable row level security;

create policy "auth full access pagos"
  on pagos for all to authenticated
  using (true) with check (true);
