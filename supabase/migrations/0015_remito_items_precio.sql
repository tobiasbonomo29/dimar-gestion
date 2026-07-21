-- =============================================================================
-- 0015_remito_items_precio.sql
-- Precio unitario OPCIONAL en los renglones del remito suelto. Si es null, el
-- remito se muestra "solo mercadería" (sin importes); si tiene valor, el PDF
-- agrega precio, subtotal y total.
-- =============================================================================

alter table remito_items
  add column if not exists precio_unitario numeric(14,2)
    check (precio_unitario is null or precio_unitario >= 0);

comment on column remito_items.precio_unitario is
  'Precio unitario opcional del renglón. Si es null, el remito no muestra importes.';
