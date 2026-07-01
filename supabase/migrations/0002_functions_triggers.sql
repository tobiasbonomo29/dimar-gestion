-- =============================================================================
-- 0002_functions_triggers.sql
-- Triggers para updated_at, recálculo automático de total del pedido y
-- registro automático del historial de estados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_clientes_updated_at
  before update on clientes
  for each row execute function set_updated_at();

create trigger trg_productos_updated_at
  before update on productos
  for each row execute function set_updated_at();

create trigger trg_variantes_updated_at
  before update on producto_variantes
  for each row execute function set_updated_at();

create trigger trg_pedidos_updated_at
  before update on pedidos
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Recálculo del total del pedido cuando cambian los ítems
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
  set total = coalesce((
    select sum(i.subtotal)
    from pedido_items i
    where i.pedido_id = v_pedido_id
  ), 0)
  where p.id = v_pedido_id;

  return null;
end;
$$;

create trigger trg_items_recalcular_total
  after insert or update or delete on pedido_items
  for each row execute function recalcular_total_pedido();

-- -----------------------------------------------------------------------------
-- Registro automático del historial al cambiar de estado
-- -----------------------------------------------------------------------------
create or replace function registrar_cambio_estado()
returns trigger
language plpgsql
as $$
begin
  -- Alta del pedido: registra el estado inicial
  if (tg_op = 'INSERT') then
    insert into historial_estado (pedido_id, estado_anterior, estado_nuevo, nota)
    values (new.id, null, new.estado, 'Pedido creado');
    return new;
  end if;

  -- Update: solo registra si cambió el estado
  if (tg_op = 'UPDATE' and new.estado is distinct from old.estado) then
    insert into historial_estado (pedido_id, estado_anterior, estado_nuevo)
    values (new.id, old.estado, new.estado);
  end if;

  return new;
end;
$$;

create trigger trg_pedidos_historial
  after insert or update on pedidos
  for each row execute function registrar_cambio_estado();
