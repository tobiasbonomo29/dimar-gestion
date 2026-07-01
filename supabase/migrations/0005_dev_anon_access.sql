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
