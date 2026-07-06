-- =============================================================================
-- 0011_descripciones_bolsas_tb.sql
-- Agrega las medidas a las bolsas TB para diferenciarlas en el catalogo.
-- =============================================================================

update productos
set
  nombre = 'Bolsa TB1 20x28',
  descripcion = 'Bolsa TB1 20x28'
where codigo = 'TB1';

update productos
set
  nombre = 'Bolsa TB2 20x35',
  descripcion = 'Bolsa TB2 20x35'
where codigo = 'TB2';

update productos
set
  nombre = 'Bolsa TB3 30x35',
  descripcion = 'Bolsa TB3 30x35'
where codigo = 'TB3';
