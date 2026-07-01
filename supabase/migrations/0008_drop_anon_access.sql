-- =============================================================================
-- 0008_drop_anon_access.sql
-- Revierte el acceso temporal del rol `anon` (migración 0005). A partir de acá
-- SOLO los usuarios autenticados acceden a los datos (policies de 0003).
-- Ejecutar cuando ya exista el usuario admin y el login esté funcionando.
-- =============================================================================

drop policy if exists "anon full access clientes"   on clientes;
drop policy if exists "anon full access productos"  on productos;
drop policy if exists "anon full access variantes"  on producto_variantes;
drop policy if exists "anon full access pedidos"    on pedidos;
drop policy if exists "anon full access items"      on pedido_items;
drop policy if exists "anon full access historial"  on historial_estado;
