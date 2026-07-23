-- =============================================================================
-- 0018_medicamentos.sql
-- Catálogo de medicamentos para importar la lista de precios de Alfabeta
-- (MF.Dat Vademécum). Clave de actualización: Nº de Registro Alfa Beta.
-- Multi-unidad: unidad_id con default = unidad del usuario logueado + RLS por
-- unidad (misma mecánica que el resto, ver 0016). Cada unidad importa su copia.
-- =============================================================================

create table medicamentos (
  id             uuid primary key default gen_random_uuid(),
  unidad_id      uuid not null references unidades (id) default current_unidad_id(),
  nro_registro   text not null,                 -- Nº de Registro Alfa Beta (clave del import)
  descripcion    text not null,
  droga          text,
  laboratorio    text,
  presentacion   text,
  precio         numeric(14,2) not null default 0 check (precio >= 0),
  codigo_barras  text,
  troquel        text,
  activo         boolean not null default true,
  actualizado_en timestamptz not null default now(),  -- última importación que tocó la fila
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table medicamentos is 'Catálogo de medicamentos (lista Alfabeta MF.Dat) por unidad. Se upsertea por (unidad_id, nro_registro).';

-- Clave única por unidad para poder upsertear en cada importación.
create unique index idx_medicamentos_unidad_registro on medicamentos (unidad_id, nro_registro);
create index idx_medicamentos_unidad on medicamentos (unidad_id);
create index idx_medicamentos_desc on medicamentos using gin (to_tsvector('spanish', descripcion));

create trigger trg_medicamentos_updated_at
  before update on medicamentos
  for each row execute function set_updated_at();

alter table medicamentos enable row level security;

create policy "unidad_medicamentos" on medicamentos
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());
