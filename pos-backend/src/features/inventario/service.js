const { ensureInventarioSchema } = require('./schema');
const { getActor, registrarAuditoria } = require('../auditoria/service');

const TIPOS_PERDIDA = new Set(['VENCIMIENTO', 'ROBO', 'ROTURA', 'MERMA', 'AJUSTE']);

const cleanText = (value, maxLength = 255) => String(value ?? '').trim().slice(0, maxLength);

const registrarMovimientoInventario = async (runner, {
  req,
  productoId,
  tipo,
  cantidad,
  direccion,
  referenciaTipo = null,
  referenciaId = null,
  motivo = null
}) => {
  await ensureInventarioSchema(runner);

  const parsedProductoId = Number(productoId);
  const parsedCantidad = Number(cantidad);
  if (!Number.isInteger(parsedProductoId) || parsedProductoId <= 0) {
    throw new Error('Producto invalido para movimiento de inventario.');
  }
  if (!Number.isInteger(parsedCantidad) || parsedCantidad <= 0) {
    throw new Error('Cantidad invalida para movimiento de inventario.');
  }
  if (!['ENTRADA', 'SALIDA'].includes(direccion)) {
    throw new Error('Direccion de movimiento invalida.');
  }

  const [productos] = await runner.execute(
    'SELECT id, nombre, stock_actual FROM productos WHERE id = ? FOR UPDATE',
    [parsedProductoId]
  );
  if (productos.length === 0) {
    throw new Error('Producto no encontrado para movimiento de inventario.');
  }

  const stockAnterior = Number(productos[0].stock_actual);
  const stockNuevo = direccion === 'ENTRADA'
    ? stockAnterior + parsedCantidad
    : stockAnterior - parsedCantidad;

  if (stockNuevo < 0) {
    throw new Error(`Stock insuficiente para ${productos[0].nombre}.`);
  }

  await runner.execute(
    'UPDATE productos SET stock_actual = ? WHERE id = ?',
    [stockNuevo, parsedProductoId]
  );

  const actor = getActor(req);
  await runner.execute(
    `INSERT INTO inventario_movimientos
      (producto_id, tipo, cantidad, stock_anterior, stock_nuevo,
       referencia_tipo, referencia_id, motivo, usuario_id, usuario_nombre)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parsedProductoId,
      cleanText(tipo, 40),
      parsedCantidad,
      stockAnterior,
      stockNuevo,
      cleanText(referenciaTipo, 60) || null,
      referenciaId === undefined || referenciaId === null ? null : cleanText(referenciaId, 80),
      cleanText(motivo, 255) || null,
      actor.usuarioId,
      actor.usuarioNombre
    ]
  );

  await registrarAuditoria(runner, {
    req,
    accion: `INVENTARIO_${tipo}`,
    entidad: 'producto',
    entidadId: parsedProductoId,
    detalle: {
      productoId: parsedProductoId,
      cantidad: parsedCantidad,
      stockAnterior,
      stockNuevo,
      referenciaTipo,
      referenciaId,
      motivo
    }
  });

  return { productoId: parsedProductoId, stockAnterior, stockNuevo };
};

const registrarPerdidaInventario = async (runner, { req, productoId, cantidad, tipo, motivo }) => {
  const cleanTipo = cleanText(tipo, 40).toUpperCase();
  if (!TIPOS_PERDIDA.has(cleanTipo)) {
    throw new Error('Tipo de perdida invalido.');
  }
  if (!cleanText(motivo, 255)) {
    throw new Error('Debe indicar el motivo de la perdida.');
  }

  return registrarMovimientoInventario(runner, {
    req,
    productoId,
    tipo: `PERDIDA_${cleanTipo}`,
    cantidad,
    direccion: 'SALIDA',
    referenciaTipo: 'PERDIDA',
    motivo
  });
};

module.exports = {
  TIPOS_PERDIDA,
  registrarMovimientoInventario,
  registrarPerdidaInventario
};
