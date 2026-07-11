const pool = require('../db/pool');
const { ensureInventarioSchema } = require('../features/inventario/schema');
const { ensureAuditoriaSchema } = require('../features/auditoria/schema');
const { registrarPerdidaInventario } = require('../features/inventario/service');
const { registrarAuditoria } = require('../features/auditoria/service');

const mapMovimiento = (row) => ({
  id: Number(row.id),
  productoId: Number(row.producto_id),
  productoNombre: row.producto_nombre,
  tipo: row.tipo,
  cantidad: Number(row.cantidad),
  stockAnterior: Number(row.stock_anterior),
  stockNuevo: Number(row.stock_nuevo),
  referenciaTipo: row.referencia_tipo,
  referenciaId: row.referencia_id,
  motivo: row.motivo,
  usuarioId: row.usuario_id !== null ? Number(row.usuario_id) : null,
  usuarioNombre: row.usuario_nombre,
  fecha: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
});

const mapAuditoria = (row) => ({
  id: Number(row.id),
  usuarioId: row.usuario_id !== null ? Number(row.usuario_id) : null,
  usuarioNombre: row.usuario_nombre,
  accion: row.accion,
  entidad: row.entidad,
  entidadId: row.entidad_id,
  detalle: typeof row.detalle === 'string' ? JSON.parse(row.detalle || 'null') : row.detalle,
  ip: row.ip,
  fecha: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
});

const listMovimientosInventario = async (req, res) => {
  await ensureInventarioSchema();
  const productoId = Number(req.query.productoId);
  const params = [];
  let where = '';
  if (Number.isInteger(productoId) && productoId > 0) {
    where = 'WHERE im.producto_id = ?';
    params.push(productoId);
  }

  const [rows] = await pool.query(
    `SELECT im.*, p.nombre AS producto_nombre
       FROM inventario_movimientos im
       JOIN productos p ON p.id = im.producto_id
       ${where}
      ORDER BY im.created_at DESC, im.id DESC
      LIMIT 200`,
    params
  );
  res.json(rows.map(mapMovimiento));
};

const registrarPerdida = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const movimiento = await registrarPerdidaInventario(connection, {
      req,
      productoId: req.body?.productoId,
      cantidad: req.body?.cantidad,
      tipo: req.body?.tipo,
      motivo: req.body?.motivo
    });

    await registrarAuditoria(connection, {
      req,
      accion: 'PERDIDA_REGISTRADA',
      entidad: 'producto',
      entidadId: movimiento.productoId,
      detalle: {
        tipo: req.body?.tipo,
        cantidad: Number(req.body?.cantidad),
        motivo: req.body?.motivo,
        stockAnterior: movimiento.stockAnterior,
        stockNuevo: movimiento.stockNuevo
      }
    });

    await connection.commit();
    res.status(201).json(movimiento);
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ message: error.message || 'No se pudo registrar la perdida.' });
  } finally {
    connection.release();
  }
};

const listAuditoria = async (_req, res) => {
  await ensureAuditoriaSchema();
  const [rows] = await pool.query(
    `SELECT *
       FROM auditoria_logs
      ORDER BY created_at DESC, id DESC
      LIMIT 200`
  );
  res.json(rows.map(mapAuditoria));
};

module.exports = {
  listMovimientosInventario,
  registrarPerdida,
  listAuditoria
};
