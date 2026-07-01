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
