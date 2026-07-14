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

const mapLote = (row) => ({
  id: Number(row.id),
  productoId: Number(row.producto_id),
  productoNombre: row.producto_nombre,
  codigoLote: row.codigo_lote,
  fechaVencimiento: row.fecha_vencimiento instanceof Date ? row.fecha_vencimiento.toISOString().slice(0, 10) : row.fecha_vencimiento,
  cantidadInicial: Number(row.cantidad_inicial),
  cantidadActual: Number(row.cantidad_actual),
  costoUnitario: row.costo_unitario === null ? null : Number(row.costo_unitario),
  proveedorId: row.proveedor_id === null ? null : Number(row.proveedor_id),
  pedidoCompraId: row.pedido_compra_id === null ? null : Number(row.pedido_compra_id),
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
    `SELECT im.*,
            p.nombre AS producto_nombre,
            COALESCE(
              im.usuario_nombre,
              u.nombre_completo,
              u.nombre_usuario,
              u.email,
              v.vendedor_nombre,
              v.vendedor_usuario,
              po.cliente_nombre
            ) AS usuario_nombre_resuelto
       FROM inventario_movimientos im
       JOIN productos p ON p.id = im.producto_id
       LEFT JOIN usuarios u ON u.id = im.usuario_id
       LEFT JOIN ventas v ON im.referencia_tipo = 'VENTA' AND v.id = im.referencia_id
       LEFT JOIN pedidos_online po ON im.referencia_tipo = 'PEDIDO_ONLINE' AND po.id = im.referencia_id
       ${where}
      ORDER BY im.created_at DESC, im.id DESC
      LIMIT 200`,
    params
  );
  res.json(rows.map((row) => mapMovimiento({
    ...row,
    usuario_nombre: row.usuario_nombre_resuelto || row.usuario_nombre
  })));
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

const listLotesInventario = async (_req, res) => {
  await ensureInventarioSchema();
  const [rows] = await pool.query(
    `SELECT il.*, p.nombre AS producto_nombre
       FROM inventario_lotes il
       JOIN productos p ON p.id = il.producto_id
      ORDER BY il.fecha_vencimiento IS NULL ASC, il.fecha_vencimiento ASC, il.id DESC
      LIMIT 300`
  );
  res.json(rows.map(mapLote));
};

module.exports = {
  listMovimientosInventario,
  registrarPerdida,
  listLotesInventario,
  listAuditoria
};
