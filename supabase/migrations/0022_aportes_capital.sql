-- =============================================================================
-- 0022_aportes_capital.sql
-- Aportes de capital: entradas de dinero que NO son ventas (inyecciones de
-- capital de socios / terceros). No van al estado de resultados operativo, se
-- llevan aparte, con quién hizo el aporte. Multi-unidad + RLS por unidad.
-- =============================================================================

create table aportes_capital (
  id         uuid primary key default gen_random_uuid(),
  unidad_id  uuid not null default current_unidad_id() references unidades (id),
  fecha      date not null default current_date,
  aportante  text not null,                 -- quién hizo el aporte
  monto      numeric(14,2) not null check (monto > 0),
  origen     text,                           -- banco / efectivo / terceros (opcional)
  nota       text,
  created_at timestamptz not null default now()
);

create index idx_aportes_unidad on aportes_capital (unidad_id);
create index idx_aportes_fecha on aportes_capital (fecha desc);

comment on table aportes_capital is 'Aportes de capital por unidad (no son ventas ni van al resultado operativo).';

alter table aportes_capital enable row level security;
create policy "unidad_aportes" on aportes_capital
  for all to authenticated
  using (unidad_id = current_unidad_id())
  with check (unidad_id = current_unidad_id());
