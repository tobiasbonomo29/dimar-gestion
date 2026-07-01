-- =============================================================================
-- 0006_pedidos_iva.sql
-- IVA discriminado en pedidos: se agrega el neto (subtotal), el % de IVA y el
-- monto de IVA. `total` pasa a ser subtotal + IVA. Los tres se recalculan solos.
-- =============================================================================

alter table pedidos
  add column subtotal        numeric(14,2) not null default 0 check (subtotal >= 0),
  add column iva_porcentaje  numeric(5,2)  not null default 21 check (iva_porcentaje >= 0),
  add column iva_monto       numeric(14,2) not null default 0 check (iva_monto >= 0);

comment on column pedidos.subtotal is 'Neto: suma de subtotales de los ítems (sin IVA).';
comment on column pedidos.iva_porcentaje is 'Alícuota de IVA aplicada al pedido (default 21%).';
comment on column pedidos.iva_monto is 'Monto de IVA = subtotal * iva_porcentaje / 100.';
comment on column pedidos.total is 'Total final = subtotal + iva_monto.';

-- -----------------------------------------------------------------------------
-- El trigger de ítems ahora actualiza el SUBTOTAL (neto). El IVA y el total los
-- calcula el trigger BEFORE de abajo a partir del subtotal y la alícuota.
-- -----------------------------------------------------------------------------
create or replace function recalcular_total_pedido()
returns trigger
language plpgsql
as $$
declare
  v_pedido_id uuid;
begin
  v_pedido_id = coalesce(new.pedido_id, old.pedido_id);

  update pedidos p
  set subtotal = coalesce((
    select sum(i.subtotal)
    from pedido_items i
    where i.pedido_id = v_pedido_id
  ), 0)
  where p.id = v_pedido_id;

  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- BEFORE INSERT/UPDATE en pedidos: deriva iva_monto y total. Como es un trigger
-- BEFORE que modifica NEW en el lugar, no genera recursión ni UPDATEs extra.
-- -----------------------------------------------------------------------------
create or replace function calcular_iva_pedido()
returns trigger
language plpgsql
as $$
begin
  new.iva_monto = round(new.subtotal * new.iva_porcentaje / 100, 2);
  new.total = new.subtotal + new.iva_monto;
  return new;
end;
$$;

create trigger trg_pedidos_calcular_iva
  before insert or update on pedidos
  for each row execute function calcular_iva_pedido();
