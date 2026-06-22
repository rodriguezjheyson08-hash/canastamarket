/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/ventasController.js
 * QUE HACE: Recibe req/res, ejecuta logica de negocio y responde al frontend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const pool = require('../db/pool');
const { productAvailabilitySql } = require('../utils/catalogAvailability');
const { mapVenta } = require('../features/ventas/mappers');
// DEPENDENCIAS BACKEND: librerias, helpers y tipos que usa este archivo.
const { ensureVentaOptionalColumns } = require('../features/ventas/schema');

// CONTROLADOR BACKEND: fetch Venta By Id procesa request/respuesta de este flujo.
const fetchVentaById = async (ventaId) => {
  await ensureVentaOptionalColumns();
  const [ventas] = await pool.query(
    `SELECT id, total, metodo_pago, recibido, vuelto, cliente_dni, cliente_nombre,
            tipo_comprobante, cliente_tipo_documento, cliente_numero_documento, cliente_ruc, cliente_direccion,
            vendedor_id, vendedor_usuario, vendedor_nombre, pago_referencia, pago_confirmado_at, fecha
       FROM ventas WHERE id = ?`,
    [ventaId]
  );
  if (ventas.length === 0) return null;

  const [detalles] = await pool.query(
    `SELECT vd.venta_id, vd.producto_id, vd.cantidad, vd.precio_unitario, vd.subtotal,
            p.nombre, p.descripcion, p.precio_venta, p.codigo_barras, p.stock_actual, p.categoria_id, p.imagen
       FROM venta_detalles vd
       JOIN productos p ON p.id = vd.producto_id
      WHERE vd.venta_id = ?`,
    [ventaId]
  );

  return mapVenta(ventas[0], detalles);
};

// CONTROLADOR BACKEND: list Ventas procesa request/respuesta de este flujo.
const listVentas = async (_req, res) => {
  await ensureVentaOptionalColumns();
  const [ventas] = await pool.query(
    `SELECT id, total, metodo_pago, recibido, vuelto, cliente_dni, cliente_nombre,
            tipo_comprobante, cliente_tipo_documento, cliente_numero_documento, cliente_ruc, cliente_direccion,
            vendedor_id, vendedor_usuario, vendedor_nombre, pago_referencia, pago_confirmado_at, fecha
       FROM ventas ORDER BY fecha DESC`
  );

  if (ventas.length === 0) {
    return res.json([]);
  }

  const ventaIds = ventas.map((venta) => venta.id);
  const [detalles] = await pool.query(
    `SELECT vd.venta_id, vd.producto_id, vd.cantidad, vd.precio_unitario, vd.subtotal,
            p.nombre, p.descripcion, p.precio_venta, p.codigo_barras, p.stock_actual, p.categoria_id, p.imagen
       FROM venta_detalles vd
       JOIN productos p ON p.id = vd.producto_id
      WHERE vd.venta_id IN (?)`,
    [ventaIds]
  );

  const detallePorVenta = detalles.reduce((acc, detalle) => {
    if (!acc[detalle.venta_id]) {
      acc[detalle.venta_id] = [];
    }
    acc[detalle.venta_id].push(detalle);
    return acc;
  }, {});

  res.json(ventas.map((venta) => mapVenta(venta, detallePorVenta[venta.id] || [])));
};

// CONTROLADOR BACKEND: create Venta procesa request/respuesta de este flujo.
const createVenta = async (req, res) => {
  const {
    productosVendidos,
    total,
    totalExtra,
    metodoPago,
    recibido,
    vuelto,
    pagoReferencia,
    clienteDni,
    clienteNombre,
    tipoComprobante,
    clienteTipoDocumento,
    clienteNumeroDocumento,
    clienteRuc,
    clienteDireccion,
    vendedorId,
    vendedorUsuario,
    vendedorNombre
  } = req.body;

  if (!Array.isArray(productosVendidos) || productosVendidos.length === 0) {
    return res.status(400).json({ message: 'Debe enviar productosVendidos.' });
  }

  const connection = await pool.getConnection();

  try {
    await ensureVentaOptionalColumns(connection);
    await connection.beginTransaction();

    const cleanDni = typeof clienteDni === 'string' ? clienteDni.trim() : '';
    const cleanNombre = typeof clienteNombre === 'string' ? clienteNombre.trim() : '';
    const cleanTipoComprobante = typeof tipoComprobante === 'string' ? tipoComprobante.trim().toLowerCase() : '';
    const cleanClienteTipoDocumento = typeof clienteTipoDocumento === 'string' ? clienteTipoDocumento.trim() : '';
    const cleanClienteNumeroDocumento = typeof clienteNumeroDocumento === 'string' ? clienteNumeroDocumento.trim() : '';
    const cleanClienteRuc = typeof clienteRuc === 'string' ? clienteRuc.trim() : '';
    const cleanClienteDireccion = typeof clienteDireccion === 'string' ? clienteDireccion.trim() : '';
    const cleanVendedorUsuario = typeof vendedorUsuario === 'string' ? vendedorUsuario.trim() : '';
    const cleanVendedorNombre = typeof vendedorNombre === 'string' ? vendedorNombre.trim() : '';
    const vendedorIdParsed = Number(vendedorId ?? req.auth?.sub);
    const vendedorIdValue = Number.isInteger(vendedorIdParsed) && vendedorIdParsed > 0 ? vendedorIdParsed : null;
    const cleanPagoReferencia = typeof pagoReferencia === 'string' ? pagoReferencia.trim() : '';
    const metodoLower = String(metodoPago || 'efectivo').toLowerCase();
    const requestedTotal = total === null || total === undefined || total === '' ? null : Number(total);
    const totalExtraParsed = totalExtra === null || totalExtra === undefined || totalExtra === '' ? 0 : Number(totalExtra);
    const recibidoParsed = recibido === null || recibido === undefined || recibido === '' ? null : Number(recibido);
    const vueltoParsed = vuelto === null || vuelto === undefined || vuelto === '' ? null : Number(vuelto);
    const shouldConfirmPago = metodoLower === 'yape' && !!cleanPagoReferencia;

    if (!['efectivo', 'yape', 'mercadopago', 'mercadopago_link'].includes(metodoLower)) {
      throw new Error('Método de pago inválido.');
    }
    if (cleanTipoComprobante && !['boleta', 'factura'].includes(cleanTipoComprobante)) {
      throw new Error('Tipo de comprobante inválido.');
    }
    if (cleanTipoComprobante === 'factura') {
      const ruc = cleanClienteRuc || cleanClienteNumeroDocumento;
      if (!/^\d{11}$/.test(ruc)) {
        throw new Error('El RUC del cliente debe tener 11 dígitos.');
      }
      if (!cleanNombre) {
        throw new Error('La razón social del cliente es obligatoria.');
      }
    }
    if (cleanTipoComprobante !== 'factura' && cleanDni && !/^\d{8}$/.test(cleanDni)) {
      throw new Error('El DNI del cliente debe tener 8 dígitos.');
    }
    if (cleanTipoComprobante === 'boleta' && cleanClienteNumeroDocumento && !/^\d{8}$/.test(cleanClienteNumeroDocumento)) {
      throw new Error('El DNI del cliente debe tener 8 dígitos.');
    }
    if (!Number.isFinite(totalExtraParsed) || totalExtraParsed < 0) {
      throw new Error('Monto adicional inválido.');
    }
    if (recibidoParsed !== null && (!Number.isFinite(recibidoParsed) || recibidoParsed < 0)) {
      throw new Error('Monto recibido inválido.');
    }
    if (vueltoParsed !== null && (!Number.isFinite(vueltoParsed) || vueltoParsed < 0)) {
      throw new Error('Vuelto inválido.');
    }
    if (shouldConfirmPago && !/^\d{3,12}$/.test(cleanPagoReferencia)) {
      throw new Error('Código de operación inválido.');
    }

    const totalExtraValue = Number(totalExtraParsed.toFixed(2));
    const preparedDetalles = [];
    let detallesTotal = 0;

    for (const item of productosVendidos) {
      const productoId = item.producto?.id || item.productoId;
      const cantidad = Number(item.cantidad || 1);
      if (!Number.isInteger(Number(productoId)) || Number(productoId) <= 0) {
        throw new Error('Producto inválido en la venta.');
      }
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error('Cantidad inválida en la venta.');
      }

      const [productoRows] = await connection.execute(
        `SELECT p.id, p.nombre, p.stock_actual, p.precio_venta
           FROM productos p
           LEFT JOIN categorias c ON c.id = p.categoria_id
          WHERE p.id = ?
            AND ${productAvailabilitySql('p', 'c')}
          FOR UPDATE`,
        [productoId]
      );

      if (productoRows.length === 0) {
        throw new Error(`Producto ${productoId} no encontrado o no disponible.`);
      }

      const producto = productoRows[0];
      if (Number(producto.stock_actual) < cantidad) {
        throw new Error(`Stock insuficiente para ${producto.nombre}.`);
      }

      const precioUnitario = Number(producto.precio_venta);
      const subtotal = Number((precioUnitario * cantidad).toFixed(2));
      detallesTotal += subtotal;
      preparedDetalles.push({
        productoId: Number(productoId),
        cantidad,
        precioUnitario,
        subtotal
      });
    }

    const totalCalculado = Number((detallesTotal + totalExtraValue).toFixed(2));
    if (requestedTotal !== null && (!Number.isFinite(requestedTotal) || Math.abs(requestedTotal - totalCalculado) > 0.01)) {
      throw new Error('Total inválido. Revisa el detalle de la venta.');
    }

    const recibidoValue = metodoLower === 'efectivo'
      ? Number((recibidoParsed ?? 0).toFixed(2))
      : (shouldConfirmPago || metodoLower === 'mercadopago' || metodoLower === 'mercadopago_link'
          ? totalCalculado
          : (recibidoParsed !== null ? Number(recibidoParsed.toFixed(2)) : null));

    if (metodoLower === 'efectivo' && recibidoValue < totalCalculado) {
      throw new Error('El monto recibido es menor al total.');
    }

    const vueltoValue = metodoLower === 'efectivo'
      ? Number((recibidoValue - totalCalculado).toFixed(2))
      : (shouldConfirmPago || metodoLower === 'mercadopago' || metodoLower === 'mercadopago_link'
          ? 0
          : (vueltoParsed !== null ? Number(vueltoParsed.toFixed(2)) : null));

    const [ventaResult] = await connection.execute(
      `INSERT INTO ventas (
        total, metodo_pago, recibido, vuelto, cliente_dni, cliente_nombre,
        tipo_comprobante, cliente_tipo_documento, cliente_numero_documento, cliente_ruc, cliente_direccion,
        vendedor_id, vendedor_usuario, vendedor_nombre, pago_referencia, pago_confirmado_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        totalCalculado,
        metodoPago || 'efectivo',
        recibidoValue,
        vueltoValue,
        cleanTipoComprobante === 'factura' ? null : (cleanDni || cleanClienteNumeroDocumento || null),
        cleanNombre || null,
        cleanTipoComprobante || null,
        cleanClienteTipoDocumento || (cleanTipoComprobante === 'factura' ? '6' : (cleanTipoComprobante === 'boleta' ? '1' : null)),
        cleanClienteNumeroDocumento || cleanClienteRuc || cleanDni || null,
        cleanClienteRuc || (cleanTipoComprobante === 'factura' ? cleanClienteNumeroDocumento : null) || null,
        cleanClienteDireccion || null,
        vendedorIdValue,
        cleanVendedorUsuario || null,
        cleanVendedorNombre || null,
        cleanPagoReferencia || null,
        shouldConfirmPago ? new Date() : null
      ]
    );

    const ventaId = ventaResult.insertId;

    for (const detalle of preparedDetalles) {
      await connection.execute(
        'INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
        [ventaId, detalle.productoId, detalle.cantidad, detalle.precioUnitario, detalle.subtotal]
      );

      await connection.execute(
        'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?',
        [detalle.cantidad, detalle.productoId]
      );
    }

    await connection.commit();

    const venta = await fetchVentaById(ventaId);
    res.status(201).json(venta);
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ message: error.message || 'No se pudo registrar la venta.' });
  } finally {
    connection.release();
  }
};

module.exports = {
  listVentas,
  createVenta
};
