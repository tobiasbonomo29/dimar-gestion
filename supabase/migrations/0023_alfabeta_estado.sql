-- =============================================================================
-- 0023_alfabeta_estado.sql
-- Estado de sincronización con la API de Alfabeta, por unidad: guarda el último
-- log procesado (ultimolog) para poder traer solo las novedades desde ahí.
-- =============================================================================

create table alfabeta_estado (
  unidad_id   uuid primary key default current_unidad_id() references unidades (id) on delete cascade,
  ultimolog   bigint,
  ultima_sync timestamptz,
  updated_at  timestamptz not null default now()
);

alter table alfabeta_estado enable row level security;
create policy "unidad_alfabeta_estado" on alfabeta_estado
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());
