-- =============================================================================
-- 0030_mercadolibre.sql
-- Integración con Mercado Libre: cada venta cobrada se carga sola como pedido
-- facturado y cobrado del cliente "MERCADO LIBRE", con las comisiones y el
-- costo de envío de ML como erogaciones, y descuento de stock.
--
--  - ml_conexiones: cuenta de ML vinculada a cada unidad (tokens OAuth). Sin
--    políticas RLS: solo la lee/escribe el servidor con la service role.
--  - ml_ventas: registro de cada orden procesada (evita duplicados y deja
--    trazabilidad). Los usuarios de la unidad la pueden leer.
--  - ml_importar_venta(): carga la venta en una sola transacción. La llama el
--    servidor (webhook / sincronización), que no tiene usuario logueado: por
--    eso se ejecuta "como" un usuario de la unidad para que current_unidad_id()
--    y los triggers (historial, totales) funcionen igual que desde la app.
-- =============================================================================

create table if not exists ml_conexiones (
  unidad_id      uuid primary key references unidades (id) on delete cascade,
  ml_user_id     bigint not null unique,
  nickname       text,
  access_token   text not null,
  refresh_token  text not null,
  expires_at     timestamptz not null,
  conectado_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table ml_conexiones enable row level security;

create table if not exists ml_ventas (
  id           uuid primary key default gen_random_uuid(),
  unidad_id    uuid not null references unidades (id) on delete cascade,
  ml_order_id  bigint not null,
  pedido_id    uuid references pedidos (id) on delete set null,
  estado       text not null check (estado in ('importada', 'error')),
  detalle      text,
  total        numeric(14,2),
  comision     numeric(14,2),
  envio        numeric(14,2),
  fecha        timestamptz,
  created_at   timestamptz not null default now(),
  unique (unidad_id, ml_order_id)
);
create index if not exists idx_ml_ventas_unidad_fecha on ml_ventas (unidad_id, created_at desc);
alter table ml_ventas enable row level security;
drop policy if exists "unidad_ml_ventas_select" on ml_ventas;
create policy "unidad_ml_ventas_select" on ml_ventas
  for select to authenticated
  using (unidad_id = current_unidad_id());

/*
 p_venta (normalizada por el servidor a partir de la orden de ML):
 {
   "order_id": 2000001234, "fecha": "2026-11-16T14:03:00-03:00",
   "comprador": "nickname (Nombre Apellido)",
   "items": [{ "sku": "RS2", "titulo": "...", "cantidad": 2, "precio": 1500.00, "comision": 390.00 }],
   "envio_costo": 0
 }
 Precios finales (IVA incluido): el pedido se carga con IVA 0 para que el total
 sea exactamente la venta bruta de ML.
*/
create or replace function ml_importar_venta(p_unidad uuid, p_venta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid;
  v_order      bigint := (p_venta->>'order_id')::bigint;
  v_fecha      timestamptz := coalesce((p_venta->>'fecha')::timestamptz, now());
  v_dia        date := (coalesce((p_venta->>'fecha')::timestamptz, now()) at time zone 'America/Argentina/Buenos_Aires')::date;
  v_cliente    uuid;
  v_pedido     uuid;
  v_numero     int;
  v_total      numeric(14,2);
  v_comision   numeric(14,2) := 0;
  v_envio      numeric(14,2) := coalesce((p_venta->>'envio_costo')::numeric, 0);
  v_item       jsonb;
  v_prod       uuid;
  v_existente  uuid;
begin
  -- Ya importada: no se repite.
  select pedido_id into v_existente from ml_ventas
   where unidad_id = p_unidad and ml_order_id = v_order and estado = 'importada';
  if found then
    return jsonb_build_object('estado', 'duplicada', 'pedido_id', v_existente);
  end if;

  -- Ejecutar como un usuario de la unidad (current_unidad_id() y triggers).
  select user_id into v_uid from perfiles where unidad_id = p_unidad order by created_at limit 1;
  if v_uid is null then
    raise exception 'La unidad % no tiene usuarios', p_unidad;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_uid::text, true);

  -- Cliente único "MERCADO LIBRE".
  select id into v_cliente from clientes
   where unidad_id = p_unidad and upper(trim(razon_social)) = 'MERCADO LIBRE'
   order by created_at limit 1;
  if v_cliente is null then
    insert into clientes (unidad_id, razon_social, condicion_fiscal, notas)
    values (p_unidad, 'MERCADO LIBRE', 'consumidor_final', 'Ventas de Mercado Libre (carga automática)')
    returning id into v_cliente;
  end if;

  -- Pedido facturado (fecha de facturación = día de la venta en ML).
  insert into pedidos (unidad_id, cliente_id, estado, fecha_creacion, fecha_facturacion,
                       iva_porcentaje, descuento_porcentaje, notas)
  values (p_unidad, v_cliente, 'facturado', v_fecha, v_dia, 0, 0,
          'Mercado Libre · Orden #' || v_order ||
          coalesce(' · Comprador: ' || nullif(p_venta->>'comprador', ''), ''))
  returning id, numero into v_pedido, v_numero;

  for v_item in select * from jsonb_array_elements(coalesce(p_venta->'items', '[]'::jsonb)) loop
    v_prod := null;
    if nullif(trim(v_item->>'sku'), '') is not null then
      select id into v_prod from productos
       where unidad_id = p_unidad and upper(trim(codigo)) = upper(trim(v_item->>'sku'))
       limit 1;
    end if;
    insert into pedido_items (unidad_id, pedido_id, producto_id, descripcion, cantidad, precio_unitario)
    values (p_unidad, v_pedido, v_prod,
            coalesce(nullif(v_item->>'titulo', ''), 'Producto Mercado Libre'),
            (v_item->>'cantidad')::numeric, (v_item->>'precio')::numeric);
    v_comision := v_comision + coalesce((v_item->>'comision')::numeric, 0);
  end loop;

  select total into v_total from pedidos where id = v_pedido;

  -- Cobrado por Mercado Pago.
  insert into pagos (unidad_id, cliente_id, pedido_id, monto, fecha, medio_pago, nota)
  values (p_unidad, v_cliente, v_pedido, v_total, v_dia, 'otro',
          'Cobrado por Mercado Pago · Orden ML #' || v_order);

  -- Comisión y envío de ML como erogaciones.
  if v_comision > 0 then
    insert into egresos (unidad_id, tipo, fecha, concepto, proveedor, categoria, monto, medio_pago, origen, nota)
    values (p_unidad, 'erogacion', v_dia, 'Comisión Mercado Libre · Orden #' || v_order, 'Mercado Libre',
            'Comisiones Mercado Libre', v_comision, 'otro', 'mercadolibre', 'Pedido #' || v_numero);
  end if;
  if v_envio > 0 then
    insert into egresos (unidad_id, tipo, fecha, concepto, proveedor, categoria, monto, medio_pago, origen, nota)
    values (p_unidad, 'erogacion', v_dia, 'Envío Mercado Libre · Orden #' || v_order, 'Mercado Libre',
            'Envíos Mercado Libre', v_envio, 'otro', 'mercadolibre', 'Pedido #' || v_numero);
  end if;

  -- Descuenta stock de los productos del catálogo.
  perform descontar_stock_pedido(v_pedido);

  insert into ml_ventas (unidad_id, ml_order_id, pedido_id, estado, total, comision, envio, fecha)
  values (p_unidad, v_order, v_pedido, 'importada', v_total, v_comision, v_envio, v_fecha)
  on conflict (unidad_id, ml_order_id) do update
    set pedido_id = excluded.pedido_id, estado = 'importada', detalle = null,
        total = excluded.total, comision = excluded.comision, envio = excluded.envio, fecha = excluded.fecha;

  return jsonb_build_object('estado', 'importada', 'pedido_id', v_pedido, 'numero', v_numero, 'total', v_total);
end $$;

revoke all on function ml_importar_venta(uuid, jsonb) from public, anon, authenticated;
grant execute on function ml_importar_venta(uuid, jsonb) to service_role;
