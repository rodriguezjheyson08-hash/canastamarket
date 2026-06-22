USE licoreria_pos;

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS productos_retirados;

CREATE TEMPORARY TABLE productos_retirados AS
SELECT p.id
  FROM productos p
  LEFT JOIN categorias c ON c.id = p.categoria_id
 WHERE LOWER(TRIM(COALESCE(c.nombre, ''))) = 'servicios'
    OR LOWER(COALESCE(p.nombre, '')) LIKE '%billar%'
    OR LOWER(COALESCE(p.descripcion, '')) LIKE '%billar%';

DELETE p
  FROM productos p
  JOIN productos_retirados pr ON pr.id = p.id
  LEFT JOIN venta_detalles vd ON vd.producto_id = p.id
 WHERE vd.producto_id IS NULL;

UPDATE productos p
  JOIN productos_retirados pr ON pr.id = p.id
   SET p.activo = 0,
       p.categoria_id = NULL;

DELETE FROM categorias
 WHERE LOWER(TRIM(nombre)) = 'servicios';

DROP TEMPORARY TABLE productos_retirados;

COMMIT;
