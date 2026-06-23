/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/dashboardController.js
 * QUE HACE: Recibe req/res, ejecuta logica de negocio y responde al frontend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// CONTROLADOR BACKEND - DASHBOARD:
// Calcula estadisticas/resumenes que se muestran en el tablero principal del frontend.
const pool = require('../db/pool');
const { productAvailabilitySql } = require('../utils/catalogAvailability');
const { ensurePedidosOnlineSchema } = require('../features/pedidosOnline/schema');
const env = require('../config/env');
const { repairImportedHistoricalDates } = require('../migrations/repairImportedHistoricalDates');
const LOW_STOCK_THRESHOLD = 10;

// CONTROLADOR BACKEND: get Stats procesa request/respuesta de este flujo.
const getStats = async (_req, res) => {
  await ensurePedidosOnlineSchema();
  const connection = await pool.getConnection();

  try {
    // Todas las metricas diarias se calculan en la zona horaria del negocio (Lima),
    // independientemente de si MySQL corre localmente o TiDB corre en UTC.
    await connection.query('SET time_zone = ?', [env.db.timeZone]);
    await repairImportedHistoricalDates(connection);

  const [[productosActivos]] = await connection.query(
    `SELECT COUNT(*) AS total
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE ${productAvailabilitySql('p', 'c')}`
  );
  const [[productosBajos]] = await connection.query(
    `SELECT COUNT(*) AS total
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = 1
        AND p.stock_actual < ?
        AND ${productAvailabilitySql('p', 'c')}`,
    [LOW_STOCK_THRESHOLD]
  );
  const [[ventasPresencialesHoy]] = await connection.query(
    'SELECT COUNT(*) AS total FROM ventas WHERE fecha >= CURDATE() AND fecha < CURDATE() + INTERVAL 1 DAY'
  );
  const [[ventasOnlineHoy]] = await connection.query(
    "SELECT COUNT(*) AS total FROM pedidos_online WHERE fecha >= CURDATE() AND fecha < CURDATE() + INTERVAL 1 DAY AND estado = 'RECOGIDO'"
  );
  const [[ingresosPresencialesHoy]] = await connection.query(
    'SELECT COALESCE(SUM(total), 0) AS total FROM ventas WHERE fecha >= CURDATE() AND fecha < CURDATE() + INTERVAL 1 DAY'
  );
  const [[ingresosOnlineHoy]] = await connection.query(
    "SELECT COALESCE(SUM(total), 0) AS total FROM pedidos_online WHERE fecha >= CURDATE() AND fecha < CURDATE() + INTERVAL 1 DAY AND estado = 'RECOGIDO'"
  );
  const [[productosVendidosPresencial]] = await connection.query(
    `SELECT COALESCE(SUM(vd.cantidad), 0) AS total
       FROM venta_detalles vd
       JOIN ventas v ON v.id = vd.venta_id
       JOIN productos p ON p.id = vd.producto_id
       LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE v.fecha >= CURDATE() AND v.fecha < CURDATE() + INTERVAL 1 DAY
        AND ${productAvailabilitySql('p', 'c')}`
  );
  const [[productosVendidosOnline]] = await connection.query(
    `SELECT COALESCE(SUM(pod.cantidad), 0) AS total
      FROM pedidos_online_detalles pod
      JOIN pedidos_online po ON po.id = pod.pedido_id
      WHERE po.fecha >= CURDATE() AND po.fecha < CURDATE() + INTERVAL 1 DAY
        AND po.estado = 'RECOGIDO'`
  );

  res.json({
    productosActivos: Number(productosActivos.total),
    ventasHoy: Number(ventasPresencialesHoy.total) + Number(ventasOnlineHoy.total),
    ingresosHoy: Number(ingresosPresencialesHoy.total) + Number(ingresosOnlineHoy.total),
    productosBajos: Number(productosBajos.total),
    productosVendidos: Number(productosVendidosPresencial.total) + Number(productosVendidosOnline.total)
  });
  } finally {
    connection.release();
  }
};

module.exports = {
  getStats
};
