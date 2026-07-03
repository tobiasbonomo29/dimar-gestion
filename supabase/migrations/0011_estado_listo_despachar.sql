-- Nuevo estado de pedido entre "en_produccion" y "despachado": pedido
-- terminado en producción y listo para salir a reparto.
alter type estado_pedido add value 'listo_despachar' before 'despachado';
