-- =============================================================================
-- schema.sql — TODAS las migraciones concatenadas en orden.
-- Pegar en Supabase → SQL Editor → New query → Run.
-- (Equivale a aplicar 0001..0007. El 0005 es acceso anon TEMPORAL sin login.)
-- =============================================================================


-- >>>>>>>>>> 0001_init.sql <<<<<<<<<<
-- =============================================================================
-- 0001_init.sql — Esquema base del sistema de gestión de pedidos (Dimar SRL)
-- Extensiones, tipos ENUM y tablas con relaciones y constraints.
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "unaccent";       -- búsqueda sin acentos

-- -----------------------------------------------------------------------------
-- Tipos ENUM
-- -----------------------------------------------------------------------------

-- Condición fiscal del cliente (AR)
create type condicion_fiscal as enum (
  'responsable_inscripto',
  'monotributo',
  'consumidor_final',
  'exento'
);

-- Categorías de producto que fabrica Dimar
create type categoria_producto as enum (
  'gel_refrigerante',
  'sachet',
  'bolsa'
);

-- Estados posibles de un pedido (flujo de trabajo)
create type estado_pedido as enum (
  'cotizado',
  'confirmado',
  'en_produccion',
  'despachado',
  'facturado',
  'cancelado'
);

-- Canal por el que llegó el pedido
create type origen_pedido as enum (
  'email',
  'whatsapp',
  'telefono'
);

-- -----------------------------------------------------------------------------
-- CLIENTES
-- -----------------------------------------------------------------------------
create table clientes (
  id                uuid primary key default gen_random_uuid(),
  razon_social      text not null,
  nombre_contacto   text,
  email             text,
  telefono          text,
  condicion_fiscal  condicion_fiscal not null default 'consumidor_final',
  cuit              text,
  direccion         text,
  notas             text,
  fecha_alta        timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table clientes is 'Clientes de Dimar SRL. La mayoría se dan de alta al recibir un mail nuevo.';

create index idx_clientes_razon_social on clientes using gin (to_tsvector('spanish', razon_social));
create index idx_clientes_email on clientes (lower(email));

-- -----------------------------------------------------------------------------
-- PRODUCTOS
-- -----------------------------------------------------------------------------
create table productos (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  categoria      categoria_producto not null,
  descripcion    text,
  unidad_medida  text not null default 'unidad',   -- ej: unidad, bulto, kg
  precio_base    numeric(14,2) not null default 0 check (precio_base >= 0),
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table productos is 'Catálogo de productos. precio_base es el precio de referencia por unidad_medida.';

create index idx_productos_categoria on productos (categoria);
create index idx_productos_nombre on productos using gin (to_tsvector('spanish', nombre));

-- Variantes de producto (tamaño / presentación / cantidad por bulto).
-- Tabla aparte para poder listar y actualizar precios por variante.
create table producto_variantes (
  id                  uuid primary key default gen_random_uuid(),
  producto_id         uuid not null references productos (id) on delete cascade,
  nombre              text not null,                       -- etiqueta legible: "Gel 400g x 24"
  tamano              text,                                -- ej: "400g", "1L"
  presentacion        text,                                -- ej: "caja", "pallet"
  cantidad_por_bulto  integer check (cantidad_por_bulto is null or cantidad_por_bulto > 0),
  precio              numeric(14,2) check (precio is null or precio >= 0), -- si null, usa precio_base
  activo              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_variantes_producto on producto_variantes (producto_id);

-- -----------------------------------------------------------------------------
-- PEDIDOS
-- -----------------------------------------------------------------------------
create table pedidos (
  id                       uuid primary key default gen_random_uuid(),
  numero                   bigint generated always as identity,  -- número legible del pedido
  cliente_id               uuid not null references clientes (id) on delete restrict,
  fecha_creacion           timestamptz not null default now(),
  estado                   estado_pedido not null default 'cotizado',
  fecha_estimada_entrega   date,
  origen                   origen_pedido,
  notas                    text,
  total                    numeric(14,2) not null default 0 check (total >= 0),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table pedidos is 'Pedidos/cotizaciones. total se recalcula automáticamente a partir de pedido_items.';
comment on column pedidos.numero is 'Número correlativo legible para identificar el pedido con el cliente.';

create unique index idx_pedidos_numero on pedidos (numero);
create index idx_pedidos_cliente on pedidos (cliente_id);
create index idx_pedidos_estado on pedidos (estado);
create index idx_pedidos_fecha_creacion on pedidos (fecha_creacion desc);

-- Ítems del pedido
create table pedido_items (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null references pedidos (id) on delete cascade,
  producto_id      uuid references productos (id) on delete restrict,
  variante_id      uuid references producto_variantes (id) on delete set null,
  descripcion      text not null,                              -- snapshot del nombre al momento de cotizar
  cantidad         numeric(14,2) not null check (cantidad > 0),
  precio_unitario  numeric(14,2) not null check (precio_unitario >= 0),
  subtotal         numeric(14,2) not null generated always as (cantidad * precio_unitario) stored,
  created_at       timestamptz not null default now()
);

create index idx_items_pedido on pedido_items (pedido_id);
create index idx_items_producto on pedido_items (producto_id);

-- -----------------------------------------------------------------------------
-- HISTORIAL DE ESTADOS (trazabilidad)
-- -----------------------------------------------------------------------------
create table historial_estado (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null references pedidos (id) on delete cascade,
  estado_anterior  estado_pedido,
  estado_nuevo     estado_pedido not null,
  fecha            timestamptz not null default now(),
  nota             text
);

create index idx_historial_pedido on historial_estado (pedido_id, fecha desc);


-- >>>>>>>>>> 0002_functions_triggers.sql <<<<<<<<<<
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


-- >>>>>>>>>> 0003_rls_policies.sql <<<<<<<<<<
-- =============================================================================
-- 0003_rls_policies.sql
-- Row Level Security. Sistema mono-usuario (área administrativa): cualquier
-- usuario autenticado tiene acceso completo. El modelo queda preparado para
-- restringir por rol en el futuro sin reescribir el resto.
-- =============================================================================

alter table clientes            enable row level security;
alter table productos           enable row level security;
alter table producto_variantes  enable row level security;
alter table pedidos             enable row level security;
alter table pedido_items        enable row level security;
alter table historial_estado    enable row level security;

-- Acceso total para usuarios autenticados
create policy "auth full access clientes"
  on clientes for all to authenticated
  using (true) with check (true);

create policy "auth full access productos"
  on productos for all to authenticated
  using (true) with check (true);

create policy "auth full access variantes"
  on producto_variantes for all to authenticated
  using (true) with check (true);

create policy "auth full access pedidos"
  on pedidos for all to authenticated
  using (true) with check (true);

create policy "auth full access items"
  on pedido_items for all to authenticated
  using (true) with check (true);

create policy "auth full access historial"
  on historial_estado for all to authenticated
  using (true) with check (true);


-- >>>>>>>>>> 0004_seed.sql <<<<<<<<<<
-- =============================================================================
-- 0004_seed.sql — Datos de ejemplo para desarrollo (opcional).
-- Ejecutar solo en entorno local / de prueba.
-- =============================================================================

insert into clientes (razon_social, nombre_contacto, email, telefono, condicion_fiscal, cuit, direccion)
values
  ('Frigorífico del Sur SA', 'Marcelo Gómez', 'compras@frigsur.com.ar', '+54 9 11 4444-1122', 'responsable_inscripto', '30-11223344-5', 'Ruta 3 Km 45, Cañuelas'),
  ('Distribuidora La Norteña', 'Ana Pérez', 'ana@lanortena.com', '+54 9 387 555-2211', 'monotributo', '27-99887766-1', 'Av. San Martín 1200, Salta');

insert into productos (nombre, categoria, descripcion, unidad_medida, precio_base)
values
  ('Gel refrigerante estándar', 'gel_refrigerante', 'Gel refrigerante reutilizable de alto rendimiento', 'unidad', 850.00),
  ('Sachet de gel 200ml', 'sachet', 'Sachet flexible con gel refrigerante', 'unidad', 320.00),
  ('Bolsa isotérmica chica', 'bolsa', 'Bolsa isotérmica para transporte de cadena de frío', 'unidad', 1500.00);

-- Variantes de ejemplo para el gel estándar
insert into producto_variantes (producto_id, nombre, tamano, presentacion, cantidad_por_bulto, precio)
select id, 'Gel 400g x 24', '400g', 'caja', 24, 19500.00
from productos where nombre = 'Gel refrigerante estándar';

insert into producto_variantes (producto_id, nombre, tamano, presentacion, cantidad_por_bulto, precio)
select id, 'Gel 800g x 12', '800g', 'caja', 12, 18000.00
from productos where nombre = 'Gel refrigerante estándar';


-- >>>>>>>>>> 0005_dev_anon_access.sql <<<<<<<<<<
-- =============================================================================
-- 0005_dev_anon_access.sql  ⚠️ TEMPORAL — FASE SIN LOGIN
-- Habilita acceso al rol `anon` mientras la autenticación está diferida.
-- BORRAR / REVERTIR esta migración cuando se implemente el login. A partir de
-- ahí, las policies de 0003 (solo `authenticated`) son las que valen.
-- =============================================================================

create policy "anon full access clientes"
  on clientes for all to anon using (true) with check (true);

create policy "anon full access productos"
  on productos for all to anon using (true) with check (true);

create policy "anon full access variantes"
  on producto_variantes for all to anon using (true) with check (true);

create policy "anon full access pedidos"
  on pedidos for all to anon using (true) with check (true);

create policy "anon full access items"
  on pedido_items for all to anon using (true) with check (true);

create policy "anon full access historial"
  on historial_estado for all to anon using (true) with check (true);

-- Para revertir:
--   drop policy "anon full access clientes"   on clientes;
--   drop policy "anon full access productos"  on productos;
--   drop policy "anon full access variantes"  on producto_variantes;
--   drop policy "anon full access pedidos"    on pedidos;
--   drop policy "anon full access items"      on pedido_items;
--   drop policy "anon full access historial"  on historial_estado;


-- >>>>>>>>>> 0006_pedidos_iva.sql <<<<<<<<<<
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


-- >>>>>>>>>> 0007_estado_historial.sql <<<<<<<<<<
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

