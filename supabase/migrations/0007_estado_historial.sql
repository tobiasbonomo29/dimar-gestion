-- =============================================================================
-- 0007_estado_historial.sql
-- El trigger de historial pasa a registrar SOLO el estado inicial (al crear el
-- pedido). Los cambios de estado posteriores los registra la aplicación, para
-- poder incluir la nota del usuario en cada movimiento.
-- =============================================================================

create or replace function registrar_cambio_estado()
returns trigger
language plpgsql
as $$
begin
  -- Solo al crear el pedido: deja registrado el estado inicial.
  if (tg_op = 'INSERT') then
    insert into historial_estado (pedido_id, estado_anterior, estado_nuevo, nota)
    values (new.id, null, new.estado, 'Pedido creado');
  end if;
  return new;
end;
$$;

-- Se re-crea el trigger solo para INSERT (antes era INSERT OR UPDATE).
drop trigger if exists trg_pedidos_historial on pedidos;

create trigger trg_pedidos_historial
  after insert on pedidos
  for each row execute function registrar_cambio_estado();
