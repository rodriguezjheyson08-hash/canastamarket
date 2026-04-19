const pool = require('../db/pool');
const LOW_STOCK_THRESHOLD = 10;

const getStats = async (_req, res) => {
  const [[productosActivos]] = await pool.query(
    'SELECT COUNT(*) AS total FROM productos WHERE activo = 1'
  );
  const [[productosBajos]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = 1
        AND p.stock_actual < ?
        AND (c.nombre IS NULL OR LOWER(TRIM(c.nombre)) <> 'servicios')`,
    [LOW_STOCK_THRESHOLD]
  );
  const [[ventasHoy]] = await pool.query(
    'SELECT COUNT(*) AS total FROM ventas WHERE DATE(fecha) = CURDATE()'
  );
  const [[ingresosHoy]] = await pool.query(
    'SELECT COALESCE(SUM(total), 0) AS total FROM ventas WHERE DATE(fecha) = CURDATE()'
  );
  const [[productosVendidos]] = await pool.query(
    `SELECT COALESCE(SUM(vd.cantidad), 0) AS total
       FROM venta_detalles vd
       JOIN ventas v ON v.id = vd.venta_id
      WHERE DATE(v.fecha) = CURDATE()`
  );

  res.json({
    productosActivos: Number(productosActivos.total),
    ventasHoy: Number(ventasHoy.total),
    ingresosHoy: Number(ingresosHoy.total),
    productosBajos: Number(productosBajos.total),
    productosVendidos: Number(productosVendidos.total)
  });
};

module.exports = {
  getStats
};
