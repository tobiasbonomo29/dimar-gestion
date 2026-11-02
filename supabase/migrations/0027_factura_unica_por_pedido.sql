-- =============================================================================
-- 0027_factura_unica_por_pedido.sql
-- Cada pedido tiene una única factura. Antes, cada descarga del PDF generaba un
-- comprobante nuevo (con otro número). Se conserva la primera factura emitida
-- de cada pedido, se eliminan las repetidas y se impide que vuelva a pasar.
-- =============================================================================

delete from comprobantes c
using (
  select id, row_number() over (partition by pedido_id order by numero, fecha) as rn
  from comprobantes
  where tipo = 'factura'
) d
where c.id = d.id and d.rn > 1;

create unique index if not exists uq_comprobantes_factura_por_pedido
  on comprobantes (pedido_id)
  where tipo = 'factura';
