-- =============================================================================
-- 0004_seed.sql — Datos de ejemplo para desarrollo (opcional).
-- Ejecutar solo en entorno local / de prueba.
-- =============================================================================

insert into clientes (razon_social, nombre_contacto, email, telefono, condicion_fiscal, cuit, direccion)
values
  ('Frigorífico del Sur SA', 'Marcelo Gómez', 'compras@frigsur.com.ar', '+54 9 11 4444-1122', 'responsable_inscripto', '30-11223344-5', 'Ruta 3 Km 45, Cañuelas'),
  ('Distribuidora La Norteña', 'Ana Pérez', 'ana@lanortena.com', '+54 9 387 555-2211', 'monotributo', '27-99887766-1', 'Av. San Martín 1200, Salta');

insert into productos (nombre, categoria, descripcion, unidad_medida, precio_base)
values
  ('Gel refrigerante estándar', 'gel_refrigerante', 'Gel refrigerante reutilizable de alto rendimiento', 'unidad', 850.00),
  ('Sachet de gel 200ml', 'sachet', 'Sachet flexible con gel refrigerante', 'unidad', 320.00),
  ('Bolsa isotérmica chica', 'bolsa', 'Bolsa isotérmica para transporte de cadena de frío', 'unidad', 1500.00);

-- Variantes de ejemplo para el gel estándar
insert into producto_variantes (producto_id, nombre, tamano, presentacion, cantidad_por_bulto, precio)
select id, 'Gel 400g x 24', '400g', 'caja', 24, 19500.00
from productos where nombre = 'Gel refrigerante estándar';

insert into producto_variantes (producto_id, nombre, tamano, presentacion, cantidad_por_bulto, precio)
select id, 'Gel 800g x 12', '800g', 'caja', 12, 18000.00
from productos where nombre = 'Gel refrigerante estándar';
