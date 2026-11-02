-- =============================================================================
-- 0028_fecha_facturacion.sql
-- La venta se imputa al día en que el pedido se FACTURÓ, no al día en que se
-- cargó. Nueva columna pedidos.fecha_facturacion (date, hora argentina):
--  - se completa sola la primera vez que el pedido pasa a facturado (o a un
--    estado posterior), con la fecha del día;
--  - se borra si el pedido vuelve a cotizado / confirmado;
--  - se puede corregir a mano (ej. se facturó el 31/10 pero se marcó el 02/11).
-- Backfill: primera vez que el historial registra el paso a un estado facturado.
-- =============================================================================

alter table pedidos add column if not exists fecha_facturacion date;

update pedidos p
set fecha_facturacion = coalesce(
  (select (min(h.fecha) at time zone 'America/Argentina/Buenos_Aires')::date
     from historial_estado h
    where h.pedido_id = p.id
      and h.estado_nuevo in ('facturado','en_produccion','listo_despachar','despachado')),
  (p.fecha_creacion at time zone 'America/Argentina/Buenos_Aires')::date)
where p.estado in ('facturado','en_produccion','listo_despachar','despachado')
  and p.fecha_facturacion is null;

create or replace function set_fecha_facturacion() returns trigger
language plpgsql as $$
begin
  if new.estado in ('facturado','en_produccion','listo_despachar','despachado') then
    if new.fecha_facturacion is null then
      new.fecha_facturacion := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
    end if;
  elsif new.estado in ('cotizado','confirmado') then
    new.fecha_facturacion := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_pedidos_fecha_facturacion on pedidos;
create trigger trg_pedidos_fecha_facturacion
  before insert or update of estado, fecha_facturacion on pedidos
  for each row execute function set_fecha_facturacion();

create index if not exists idx_pedidos_fecha_facturacion on pedidos (fecha_facturacion);
