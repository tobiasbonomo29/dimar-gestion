-- =============================================================================
-- 0016_multi_unidad.sql
-- Multi-unidad de negocio en la misma base. Cada usuario pertenece a una unidad
-- (perfiles) y solo ve/gestiona las filas de su unidad. Los datos existentes se
-- asignan a la unidad "Dimar SRL" (Friopack). El nuevo usuario arranca en blanco.
--
-- Mecánica:
--  - unidad_id en cada tabla, con DEFAULT = unidad del usuario logueado, así los
--    INSERT de la app no cambian.
--  - RLS por unidad (antes era acceso total para cualquier autenticado).
--  - Numeración de comprobantes pasa a ser única POR unidad.
--
-- Se ejecuta como una única transacción implícita: si algo falla, no se aplica
-- nada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Unidades de negocio (incluye datos de membrete para los PDF).
-- -----------------------------------------------------------------------------
create table unidades (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  cuit       text,
  direccion  text,
  email      text,
  telefono   text,
  created_at timestamptz not null default now()
);

-- Mapea cada usuario de auth a su unidad.
create table perfiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  unidad_id  uuid not null references unidades (id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Unidad del usuario actual. SECURITY DEFINER para leer perfiles sin depender de
-- las policies del que consulta (se usa en defaults y en las policies de RLS).
create or replace function current_unidad_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select unidad_id from perfiles where user_id = auth.uid()
$$;

-- -----------------------------------------------------------------------------
-- 2) Alta de las dos unidades y mapeo de los usuarios existentes.
--    UUIDs fijos y legibles para referenciarlos en el backfill.
-- -----------------------------------------------------------------------------
insert into unidades (id, nombre) values
  ('11111111-1111-1111-1111-111111111111', 'Dimar SRL'),
  ('22222222-2222-2222-2222-222222222222', 'AZ Distribuidora');

insert into perfiles (user_id, unidad_id) values
  ('8ef968ca-b7d4-4c41-99a1-919d641266fa', '11111111-1111-1111-1111-111111111111'), -- friopack4@gmail.com
  ('886effbd-de71-4ee2-a92b-58ae8543c746', '22222222-2222-2222-2222-222222222222'); -- azdistribuidora4@gmail.com

-- -----------------------------------------------------------------------------
-- 3) unidad_id en cada tabla de datos.
--    Orden por tabla: agregar columna -> backfill a Friopack -> NOT NULL ->
--    default = unidad del usuario logueado (para los INSERT futuros).
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  frio constant text := '11111111-1111-1111-1111-111111111111';
  tablas text[] := array[
    'clientes','productos','producto_variantes','pedidos','pedido_items',
    'historial_estado','comprobantes','pagos','remitos','remito_items'
  ];
begin
  foreach t in array tablas loop
    execute format('alter table %I add column unidad_id uuid references unidades (id)', t);
    execute format('update %I set unidad_id = %L where unidad_id is null', t, frio);
    execute format('alter table %I alter column unidad_id set not null', t);
    execute format('alter table %I alter column unidad_id set default current_unidad_id()', t);
    execute format('create index %I on %I (unidad_id)', 'idx_' || t || '_unidad', t);
  end loop;
end $$;

-- Numeración de comprobantes: pasa a ser única POR unidad (antes era global).
-- Así cada unidad numera sus remitos/facturas desde 1 sin chocar con la otra.
drop index if exists idx_comprobantes_tipo_numero;
create unique index idx_comprobantes_tipo_numero on comprobantes (unidad_id, tipo, numero);

-- -----------------------------------------------------------------------------
-- 4) RLS por unidad. Reemplaza las policies "acceso total" por "solo tu unidad".
--    Se limpian también las policies anon que hayan quedado (fase sin login).
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  tablas text[] := array[
    'clientes','productos','producto_variantes','pedidos','pedido_items',
    'historial_estado','comprobantes','pagos','remitos','remito_items'
  ];
  pol record;
begin
  foreach t in array tablas loop
    -- Borra cualquier policy previa de la tabla (auth/anon "acceso total").
    for pol in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on %I', pol.policyname, t);
    end loop;
    -- Nueva policy: solo filas de la unidad del usuario.
    execute format(
      'create policy %I on %I for all to authenticated using (unidad_id = current_unidad_id()) with check (unidad_id = current_unidad_id())',
      'unidad_' || t, t
    );
  end loop;
end $$;

-- unidades / perfiles: cada usuario ve su propio perfil y su propia unidad.
alter table unidades enable row level security;
alter table perfiles enable row level security;

create policy "perfil_propio" on perfiles
  for select to authenticated using (user_id = auth.uid());

create policy "unidad_propia" on unidades
  for select to authenticated using (id = current_unidad_id());
