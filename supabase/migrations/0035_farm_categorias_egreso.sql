-- =============================================================================
-- 0035_farm_categorias_egreso.sql
-- Categorias de egreso de la farmacia creadas por el usuario desde el sistema.
--
-- El rubro (farm_rubro_egreso) sigue siendo una lista fija porque define en que
-- linea del estado de resultados cae el egreso. Lo que el usuario agrega son
-- CATEGORIAS (ej. "Delivery", "Limpieza") y cada una pertenece a un rubro: al
-- elegirla en el formulario se completan rubro + categoria del egreso, asi el
-- estado de resultados la suma en la linea correcta.
-- =============================================================================

create table farm_categorias_egreso (
  id         uuid primary key default gen_random_uuid(),
  unidad_id  uuid not null references unidades (id) default current_unidad_id(),
  nombre     text not null,
  rubro      farm_rubro_egreso not null,
  created_at timestamptz not null default now()
);

comment on table farm_categorias_egreso is 'Categorias de egreso de la farmacia dadas de alta por el usuario; cada una cae en un rubro fijo.';

create index idx_farm_categorias_egreso_unidad on farm_categorias_egreso (unidad_id);
create unique index idx_farm_categorias_egreso_nombre on farm_categorias_egreso (unidad_id, lower(nombre));

alter table farm_categorias_egreso enable row level security;

create policy "unidad_farm_categorias_egreso" on farm_categorias_egreso
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());
