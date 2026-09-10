-- =============================================================================
-- 0032_farmacia.sql
-- Modulo administrativo de FARMACIA (carga 100% manual).
--
-- A diferencia del circuito de Dimar (donde las ventas se derivan de los
-- pedidos facturados), aca el usuario carga TODO a mano: la facturacion, los
-- ingresos por venta con su detalle (efectivo / banco / obra social), los otros
-- ingresos (drogueria, NC PAMI, etc.), los egresos (mercaderia, proveedores,
-- gastos fijos, impuestos), los sueldos y los parametros del estado de
-- resultados. Modelado sobre las planillas "NUMEROS DE LA FARMACIA".
--
-- Todas las tablas van prefijadas `farm_` y son multi-unidad + RLS por unidad,
-- igual que el resto del sistema (ver 0016_multi_unidad.sql).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

-- Ingreso por VENTA (mostrador / obra social) vs OTRO ingreso (drogueria,
-- notas de credito de PAMI, convenios, etc.). El estado de resultados los
-- separa en "Ventas Netas" y "Otros Ingresos".
create type farm_tipo_ingreso as enum ('venta', 'otro');

-- Rubro del egreso: define en que linea del estado de resultados cae.
--   mercaderia -> Costo de Mercaderia (CMV)
--   fijo       -> Costos Fijos
--   variable   -> Gastos Variables
--   impuesto   -> Impuestos
--   financiero -> Intereses Financieros
--   otro       -> Gastos Variables (cajon de sastre)
-- Los sueldos NO son un rubro de egreso: se liquidan en `farm_sueldos` para no
-- contarlos dos veces.
create type farm_rubro_egreso as enum (
  'mercaderia', 'fijo', 'variable', 'impuesto', 'financiero', 'otro'
);

-- Como se calcula el CMV del periodo en el estado de resultados.
--   porcentaje -> % estimado sobre las ventas (como en la planilla: 35%)
--   monto      -> un importe cargado a mano
--   mercaderia -> la suma real de los egresos de rubro 'mercaderia'
create type farm_modo_cmv as enum ('porcentaje', 'monto', 'mercaderia');

-- -----------------------------------------------------------------------------
-- Proveedores de la farmacia (se dan de alta a mano)
-- -----------------------------------------------------------------------------
create table farm_proveedores (
  id         uuid primary key default gen_random_uuid(),
  unidad_id  uuid not null references unidades (id) default current_unidad_id(),
  nombre     text not null,
  categoria  text,           -- Reparto, Libreria, Pago mercaderia, Comision...
  contacto   text,
  tipo_pago  text,           -- Transferencia, Efectivo, Cheque...
  telefono   text,
  email      text,
  cuit       text,
  notas      text,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table farm_proveedores is 'Proveedores de la farmacia, cargados a mano.';

create index idx_farm_proveedores_unidad on farm_proveedores (unidad_id);
create unique index idx_farm_proveedores_nombre on farm_proveedores (unidad_id, lower(nombre));

-- -----------------------------------------------------------------------------
-- Ingresos: ventas y otros ingresos
--
-- `total` es el importe del ingreso (la venta neta de esa linea) y
-- efectivo/banco/obra_social es el DESGLOSE de como entro la plata. En la
-- planilla no siempre coinciden (ej. una semana factura $25.560.136 y de eso
-- entraron $6.808.366 en efectivo), asi que se guardan por separado y la app
-- muestra la diferencia en vez de forzar que cierre.
-- -----------------------------------------------------------------------------
create table farm_ingresos (
  id           uuid primary key default gen_random_uuid(),
  unidad_id    uuid not null references unidades (id) default current_unidad_id(),
  tipo         farm_tipo_ingreso not null default 'venta',
  fecha        date not null default current_date,
  semana       text,                                   -- "Semana 1", "Semana 2-3"...
  concepto     text not null,                          -- Facturacion, NC PAMI, OSDE, Monte Verde...
  efectivo     numeric(14,2) not null default 0 check (efectivo >= 0),
  banco        numeric(14,2) not null default 0 check (banco >= 0),
  obra_social  numeric(14,2) not null default 0 check (obra_social >= 0),
  total        numeric(14,2) not null check (total >= 0),
  nota         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table farm_ingresos is 'Ingresos de la farmacia cargados a mano: ventas y otros ingresos, con desglose efectivo/banco/obra social.';
comment on column farm_ingresos.total is 'Importe neto del ingreso. Puede diferir de la suma del desglose (lo facturado vs lo cobrado).';

create index idx_farm_ingresos_unidad on farm_ingresos (unidad_id);
create index idx_farm_ingresos_fecha on farm_ingresos (fecha desc);
create index idx_farm_ingresos_tipo on farm_ingresos (tipo);

-- -----------------------------------------------------------------------------
-- Egresos: mercaderia, proveedores, gastos fijos, impuestos, gastos varios
-- -----------------------------------------------------------------------------
create table farm_egresos (
  id           uuid primary key default gen_random_uuid(),
  unidad_id    uuid not null references unidades (id) default current_unidad_id(),
  rubro        farm_rubro_egreso not null default 'variable',
  fecha        date not null default current_date,
  semana       text,
  concepto     text not null,
  categoria    text,                                   -- libre: Transporte, Servicios, Comisiones...
  proveedor_id uuid references farm_proveedores (id) on delete set null,
  proveedor    text,                                   -- nombre libre si no esta en la lista
  medio_pago   medio_pago not null default 'transferencia',
  monto        numeric(14,2) not null check (monto >= 0),
  vencimiento  date,
  pagado       boolean not null default true,
  nota         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table farm_egresos is 'Egresos de la farmacia: mercaderia, gastos fijos, impuestos y gastos varios. Los sueldos van en farm_sueldos.';

create index idx_farm_egresos_unidad on farm_egresos (unidad_id);
create index idx_farm_egresos_fecha on farm_egresos (fecha desc);
create index idx_farm_egresos_rubro on farm_egresos (rubro);

-- -----------------------------------------------------------------------------
-- Costos fijos: plantilla de gastos recurrentes mensuales
--
-- Es solo la PLANTILLA (alquiler, luz, contador...). El estado de resultados
-- nunca lee de aca: se genera con un click el egreso del mes (rubro 'fijo') a
-- partir de estas filas, y esos egresos son los que suman. Asi no se cuenta
-- dos veces ni se asume pagado lo que no se pago.
-- -----------------------------------------------------------------------------
create table farm_costos_fijos (
  id               uuid primary key default gen_random_uuid(),
  unidad_id        uuid not null references unidades (id) default current_unidad_id(),
  concepto         text not null,
  proveedor        text,
  dia_vencimiento  int check (dia_vencimiento between 1 and 31),
  monto            numeric(14,2) not null default 0 check (monto >= 0),
  activo           boolean not null default true,
  nota             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table farm_costos_fijos is 'Plantilla de gastos fijos mensuales. Se usa para generar los egresos del mes, no suma por si sola.';

create index idx_farm_costos_fijos_unidad on farm_costos_fijos (unidad_id);

-- -----------------------------------------------------------------------------
-- Empleados y liquidacion de sueldos por periodo
-- -----------------------------------------------------------------------------
create table farm_empleados (
  id            uuid primary key default gen_random_uuid(),
  unidad_id     uuid not null references unidades (id) default current_unidad_id(),
  nombre        text not null,
  puesto        text,
  fecha_ingreso date,
  sueldo_bruto  numeric(14,2) not null default 0 check (sueldo_bruto >= 0),
  cargas_pct    numeric(6,2) not null default 23 check (cargas_pct >= 0),
  activo        boolean not null default true,
  nota          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table farm_empleados is 'Empleados de la farmacia con su sueldo bruto de referencia y % de cargas sociales.';

create index idx_farm_empleados_unidad on farm_empleados (unidad_id);

-- Liquidacion de un empleado en un periodo (mes). Se guarda el nombre y puesto
-- congelados para que el historico no cambie si despues se edita el empleado.
create table farm_sueldos (
  id           uuid primary key default gen_random_uuid(),
  unidad_id    uuid not null references unidades (id) default current_unidad_id(),
  periodo      text not null check (periodo ~ '^[0-9]{4}-[0-9]{2}$'),   -- 'YYYY-MM'
  empleado_id  uuid references farm_empleados (id) on delete set null,
  empleado     text not null,
  puesto       text,
  sueldo_bruto numeric(14,2) not null default 0 check (sueldo_bruto >= 0),
  cargas_pct   numeric(6,2) not null default 0 check (cargas_pct >= 0),
  cargas_monto numeric(14,2) not null default 0 check (cargas_monto >= 0),
  sueldo_neto  numeric(14,2) not null default 0 check (sueldo_neto >= 0),
  pagado       boolean not null default false,
  nota         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Costo total para la farmacia = bruto + cargas sociales.
  costo_total  numeric(14,2) generated always as (sueldo_bruto + cargas_monto) stored
);

comment on table farm_sueldos is 'Liquidacion mensual de sueldos. costo_total (bruto + cargas) es lo que va a Gastos de Personal en el EERR.';

create index idx_farm_sueldos_unidad on farm_sueldos (unidad_id);
create index idx_farm_sueldos_periodo on farm_sueldos (periodo);
create unique index idx_farm_sueldos_periodo_empleado
  on farm_sueldos (unidad_id, periodo, empleado_id)
  where empleado_id is not null;

-- -----------------------------------------------------------------------------
-- Parametros del estado de resultados por periodo
--
-- Todo lo que no se deduce de los movimientos cargados y el usuario define a
-- mano: la venta neta (si quiere pisar la suma de los ingresos), como calcular
-- el CMV, amortizaciones, intereses y la alicuota de ganancias.
-- -----------------------------------------------------------------------------
create table farm_eerr (
  id             uuid primary key default gen_random_uuid(),
  unidad_id      uuid not null references unidades (id) default current_unidad_id(),
  periodo        text not null check (periodo ~ '^[0-9]{4}-[0-9]{2}$'),
  -- NULL = usar la suma de los ingresos cargados. Con valor = pisa ese total.
  venta_neta     numeric(14,2) check (venta_neta >= 0),
  otros_ingresos numeric(14,2) check (otros_ingresos >= 0),
  cmv_modo       farm_modo_cmv not null default 'porcentaje',
  cmv_porcentaje numeric(6,2) not null default 35 check (cmv_porcentaje >= 0),
  cmv_monto      numeric(14,2) not null default 0 check (cmv_monto >= 0),
  depreciacion   numeric(14,2) not null default 0 check (depreciacion >= 0),
  intereses      numeric(14,2) not null default 0 check (intereses >= 0),
  ganancias_pct  numeric(6,2) not null default 0 check (ganancias_pct >= 0),
  nota           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table farm_eerr is 'Parametros manuales del estado de resultados de la farmacia, por periodo (YYYY-MM).';

create unique index idx_farm_eerr_periodo on farm_eerr (unidad_id, periodo);

-- -----------------------------------------------------------------------------
-- updated_at + RLS por unidad en todas las tablas del modulo
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  tablas text[] := array[
    'farm_proveedores','farm_ingresos','farm_egresos','farm_costos_fijos',
    'farm_empleados','farm_sueldos','farm_eerr'
  ];
begin
  foreach t in array tablas loop
    execute format(
      'create trigger %I before update on %I for each row execute function set_updated_at()',
      'trg_' || t || '_updated_at', t
    );
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all to authenticated using (unidad_id = current_unidad_id()) with check (unidad_id = current_unidad_id())',
      'unidad_' || t, t
    );
  end loop;
end $$;
