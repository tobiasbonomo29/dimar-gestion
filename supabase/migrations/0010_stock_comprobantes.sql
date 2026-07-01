-- =============================================================================
-- 0010_stock_comprobantes.sql
-- 1) Stock por producto.
-- 2) Comprobantes (remito / factura) generados desde un pedido.
-- 3) Función para descontar stock del pedido (idempotente).
-- =============================================================================

-- 1) Stock --------------------------------------------------------------------
alter table productos
  add column if not exists stock numeric(14,2) not null default 0;

comment on column productos.stock is 'Stock disponible del producto (unidades de su unidad_medida).';

-- Marca en el pedido para no descontar stock más de una vez.
alter table pedidos
  add column if not exists stock_descontado boolean not null default false;

-- 2) Comprobantes -------------------------------------------------------------
create type tipo_comprobante as enum ('remito', 'factura');

create table comprobantes (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references pedidos (id) on delete cascade,
  tipo        tipo_comprobante not null,
  numero      integer not null,           -- correlativo por tipo (asignado por la app)
  fecha       timestamptz not null default now(),
  total       numeric(14,2) not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_comprobantes_pedido on comprobantes (pedido_id);
create unique index idx_comprobantes_tipo_numero on comprobantes (tipo, numero);

comment on table comprobantes is 'Remitos y facturas internas generadas desde un pedido (no fiscal / no AFIP).';

-- 3) Descuento de stock (idempotente por pedido) ------------------------------
create or replace function descontar_stock_pedido(p_pedido_id uuid)
returns void
language plpgsql
as $$
begin
  -- Si ya se descontó para este pedido, no repetir.
  if exists (select 1 from pedidos where id = p_pedido_id and stock_descontado) then
    return;
  end if;

  update productos p
  set stock = p.stock - agg.cant
  from (
    select producto_id, sum(cantidad) as cant
    from pedido_items
    where pedido_id = p_pedido_id and producto_id is not null
    group by producto_id
  ) agg
  where p.id = agg.producto_id;

  update pedidos set stock_descontado = true where id = p_pedido_id;
end;
$$;

-- RLS
alter table comprobantes enable row level security;

create policy "auth full access comprobantes"
  on comprobantes for all to authenticated using (true) with check (true);

-- Acceso anon TEMPORAL (fase sin login). Quitar junto con las policies de 0008.
create policy "anon full access comprobantes"
  on comprobantes for all to anon using (true) with check (true);
