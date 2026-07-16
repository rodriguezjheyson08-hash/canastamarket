const { ensureInventarioSchema } = require('./schema');
const { resolveActor, registrarAuditoria } = require('../auditoria/service');
const { validateFechaVencimiento } = require('../productos/validators');

const TIPOS_PERDIDA = new Set(['VENCIMIENTO', 'ROBO', 'ROTURA', 'MERMA', 'AJUSTE']);

const cleanText = (value, maxLength = 255) => String(value ?? '').trim().slice(0, maxLength);
const cleanCustomTipoPerdida = (value) => cleanText(value, 40)
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9_ ]/g, '')
  .trim()
  .replace(/\s+/g, '_');

const normalizeDate = (value) => {
  const text = cleanText(value, 10);
  if (!text) return null;
  return validateFechaVencimiento(text);
};

const consumirLotesInventario = async (runner, productoId, cantidad) => {
  const [lotes] = await runner.execute(
    `SELECT id, cantidad_actual
       FROM inventario_lotes
      WHERE producto_id = ? AND cantidad_actual > 0
      ORDER BY fecha_vencimiento IS NULL ASC, fecha_vencimiento ASC, id ASC
      FOR UPDATE`,
    [productoId]
  );

  let restante = cantidad;
  for (const lote of lotes) {
    if (restante <= 0) break;
    const disponible = Number(lote.cantidad_actual);
    const usado = Math.min(disponible, restante);
    await runner.execute(
      'UPDATE inventario_lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?',
      [usado, lote.id]
    );
    restante -= usado;
  }
};

const registrarLoteEntrada = async (runner, {
  productoId,
  cantidad,
  fechaVencimiento,
  costoUnitario,
  proveedorId,
  pedidoCompraId,
  codigoLote
}) => {
  await runner.execute(
    `INSERT INTO inventario_lotes
      (producto_id, codigo_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual,
       costo_unitario, proveedor_id, pedido_compra_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      productoId,
      cleanText(codigoLote, 80) || null,
      normalizeDate(fechaVencimiento),
      cantidad,
      cantidad,
      costoUnitario === undefined || costoUnitario === null || costoUnitario === '' ? null : Number(costoUnitario),
      proveedorId === undefined || proveedorId === null ? null : Number(proveedorId),
      pedidoCompraId === undefined || pedidoCompraId === null ? null : Number(pedidoCompraId)
    ]
  );
};

const registrarMovimientoInventario = async (runner, {
  req,
  productoId,
  tipo,
  cantidad,
  direccion,
  referenciaTipo = null,
  referenciaId = null,
  motivo = null,
  fechaVencimiento = null,
  costoUnitario = null,
  proveedorId = null,
  pedidoCompraId = null,
  codigoLote = null
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
  const fechaVencimientoNormalizada = direccion === 'ENTRADA' ? normalizeDate(fechaVencimiento) : null;

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

  if (direccion === 'SALIDA') {
    await consumirLotesInventario(runner, parsedProductoId, parsedCantidad);
  } else if (direccion === 'ENTRADA') {
    await registrarLoteEntrada(runner, {
      productoId: parsedProductoId,
      cantidad: parsedCantidad,
      fechaVencimiento: fechaVencimientoNormalizada,
      costoUnitario,
      proveedorId,
      pedidoCompraId,
      codigoLote
    });
  }

  const actor = await resolveActor(runner, req);
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
  const cleanTipo = cleanCustomTipoPerdida(tipo);
  if (!cleanTipo || (!TIPOS_PERDIDA.has(cleanTipo) && cleanTipo.length < 3)) {
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
  registrarLoteEntrada,
  registrarPerdidaInventario
};
