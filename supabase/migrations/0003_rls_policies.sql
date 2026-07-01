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
