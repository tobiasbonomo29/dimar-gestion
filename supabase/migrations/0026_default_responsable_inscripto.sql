-- =============================================================================
-- 0026_default_responsable_inscripto.sql
-- Cambia la condición fiscal por defecto de los clientes nuevos a
-- "responsable_inscripto" (antes "consumidor_final"). No modifica clientes
-- existentes; solo aplica a altas que no envíen el campo.
-- =============================================================================

alter table clientes
  alter column condicion_fiscal set default 'responsable_inscripto'::condicion_fiscal;
