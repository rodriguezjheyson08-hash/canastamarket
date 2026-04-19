const pool = require('../db/pool');
const { ensureRepartoSchema } = require('../utils/ensureRepartoSchema');

let ventaClienteColumnsChecked = false;

const ensureVentaOptionalColumns = async (runner = pool) => {
  if (ventaClienteColumnsChecked) return;

  const [rows] = await runner.query(
    `SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ventas'
	        AND COLUMN_NAME IN (
            'metodo_pago',
	          'cliente_id', 'cliente_dni', 'cliente_nombre',
	          'vendedor_id', 'vendedor_usuario', 'vendedor_nombre',
	          'pedido_estado', 'pedido_updated_at', 'direccion_entrega',
	          'ubicacion_lat', 'ubicacion_lng', 'pedido_rechazo_motivo',
	          'repartidor_id', 'repartidor_asignado_at',
	          'pago_referencia', 'pago_confirmado_at'
	        )`
	  );

  const columnMap = new Map(rows.map((row) => [row.COLUMN_NAME, row]));
  const columnSet = new Set(rows.map((row) => row.COLUMN_NAME));

  const metodoPagoLength = Number(columnMap.get('metodo_pago')?.CHARACTER_MAXIMUM_LENGTH || 0);
  if (!columnSet.has('metodo_pago')) {
    await runner.query("ALTER TABLE ventas ADD COLUMN metodo_pago VARCHAR(40) NOT NULL DEFAULT 'efectivo'");
  } else if (metodoPagoLength > 0 && metodoPagoLength < 40) {
    await runner.query("ALTER TABLE ventas MODIFY COLUMN metodo_pago VARCHAR(40) NOT NULL DEFAULT 'efectivo'");
  }

  if (!columnSet.has('cliente_id')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN cliente_id INT NULL');
  }

  if (!columnSet.has('cliente_dni')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN cliente_dni VARCHAR(8) NULL');
  }

  if (!columnSet.has('cliente_nombre')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN cliente_nombre VARCHAR(160) NULL');
  }

  if (!columnSet.has('vendedor_id')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN vendedor_id INT NULL');
  }

  if (!columnSet.has('vendedor_usuario')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN vendedor_usuario VARCHAR(50) NULL');
  }

  if (!columnSet.has('vendedor_nombre')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN vendedor_nombre VARCHAR(120) NULL');
  }

  if (!columnSet.has('pedido_estado')) {
    await runner.query("ALTER TABLE ventas ADD COLUMN pedido_estado VARCHAR(20) NULL");
  }

  if (!columnSet.has('pedido_updated_at')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN pedido_updated_at TIMESTAMP NULL');
  }

  if (!columnSet.has('direccion_entrega')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN direccion_entrega VARCHAR(255) NULL');
  }

  if (!columnSet.has('ubicacion_lat')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN ubicacion_lat DECIMAL(10, 7) NULL');
  }

  if (!columnSet.has('ubicacion_lng')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN ubicacion_lng DECIMAL(10, 7) NULL');
  }

  if (!columnSet.has('pedido_rechazo_motivo')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN pedido_rechazo_motivo VARCHAR(255) NULL');
  }

  if (!columnSet.has('repartidor_id')) {
    await runner.query('ALTER TABLE ventas ADD COLUMN repartidor_id INT NULL');
  }

	if (!columnSet.has('repartidor_asignado_at')) {
	  await runner.query('ALTER TABLE ventas ADD COLUMN repartidor_asignado_at TIMESTAMP NULL');
	}

	if (!columnSet.has('pago_referencia')) {
	  await runner.query('ALTER TABLE ventas ADD COLUMN pago_referencia VARCHAR(80) NULL');
	}

	if (!columnSet.has('pago_confirmado_at')) {
	  await runner.query('ALTER TABLE ventas ADD COLUMN pago_confirmado_at TIMESTAMP NULL');
	}

	ventaClienteColumnsChecked = true;
};

const resetVentasAutoIncrementIfEmpty = async (runner = pool) => {
  const [rows] = await runner.query('SELECT COUNT(*) AS total FROM ventas');
  const total = Number(rows[0]?.total || 0);
  if (total === 0) {
    await runner.query('ALTER TABLE ventas AUTO_INCREMENT = 1');
    await runner.query('ALTER TABLE venta_detalles AUTO_INCREMENT = 1');
  }
};

const mapVenta = (ventaRow, detalleRows) => ({
  id: ventaRow.id,
  total: Number(ventaRow.total),
  fecha: ventaRow.fecha instanceof Date ? ventaRow.fecha.toISOString() : ventaRow.fecha,
  metodoPago: ventaRow.metodo_pago,
  recibido: ventaRow.recibido !== null ? Number(ventaRow.recibido) : null,
  vuelto: ventaRow.vuelto !== null ? Number(ventaRow.vuelto) : null,
  clienteId: ventaRow.cliente_id !== null && ventaRow.cliente_id !== undefined ? Number(ventaRow.cliente_id) : null,
  clienteDni: ventaRow.cliente_dni || null,
  clienteNombre: ventaRow.cliente_nombre || null,
  pedidoEstado: ventaRow.pedido_estado || null,
  pedidoUpdatedAt: ventaRow.pedido_updated_at
    ? (ventaRow.pedido_updated_at instanceof Date ? ventaRow.pedido_updated_at.toISOString() : ventaRow.pedido_updated_at)
    : null,
  direccionEntrega: ventaRow.direccion_entrega || null,
  ubicacionLat: ventaRow.ubicacion_lat !== null && ventaRow.ubicacion_lat !== undefined ? Number(ventaRow.ubicacion_lat) : null,
  ubicacionLng: ventaRow.ubicacion_lng !== null && ventaRow.ubicacion_lng !== undefined ? Number(ventaRow.ubicacion_lng) : null,
  pedidoRechazoMotivo: ventaRow.pedido_rechazo_motivo || null,
  vendedorId: ventaRow.vendedor_id !== null ? Number(ventaRow.vendedor_id) : null,
  vendedorUsuario: ventaRow.vendedor_usuario || null,
  vendedorNombre: ventaRow.vendedor_nombre || null,
  repartidorId: ventaRow.repartidor_id !== null && ventaRow.repartidor_id !== undefined ? Number(ventaRow.repartidor_id) : null,
  repartidorAsignadoAt: ventaRow.repartidor_asignado_at
    ? (ventaRow.repartidor_asignado_at instanceof Date ? ventaRow.repartidor_asignado_at.toISOString() : ventaRow.repartidor_asignado_at)
    : null,
  pagoReferencia: ventaRow.pago_referencia || null,
  pagoConfirmadoAt: ventaRow.pago_confirmado_at
    ? (ventaRow.pago_confirmado_at instanceof Date ? ventaRow.pago_confirmado_at.toISOString() : ventaRow.pago_confirmado_at)
    : null,
  productosVendidos: detalleRows.map((detalle) => ({
    producto: {
      id: detalle.producto_id,
      nombre: detalle.nombre,
      descripcion: detalle.descripcion,
      precioVenta: Number(detalle.precio_unitario ?? detalle.precio_venta),
      stockActual: Number(detalle.stock_actual),
      categoriaId: detalle.categoria_id,
      imagen: detalle.imagen
    },
    cantidad: Number(detalle.cantidad)
  }))
});

const fetchVentaById = async (ventaId) => {
  await ensureVentaOptionalColumns();
  const [ventas] = await pool.query(
    `SELECT id, total, metodo_pago, recibido, vuelto, cliente_id, cliente_dni, cliente_nombre,
            pedido_estado, pedido_updated_at, direccion_entrega, ubicacion_lat, ubicacion_lng, pedido_rechazo_motivo,
            vendedor_id, vendedor_usuario, vendedor_nombre, repartidor_id, repartidor_asignado_at,
            pago_referencia, pago_confirmado_at, fecha
       FROM ventas WHERE id = ?`,
    [ventaId]
  );
  if (ventas.length === 0) {
    return null;
  }
  const [detalles] = await pool.query(
    `SELECT vd.venta_id, vd.producto_id, vd.cantidad, vd.precio_unitario, vd.subtotal,
            p.nombre, p.descripcion, p.precio_venta, p.stock_actual, p.categoria_id, p.imagen
       FROM venta_detalles vd
       JOIN productos p ON p.id = vd.producto_id
      WHERE vd.venta_id = ?`,
    [ventaId]
  );

  return mapVenta(ventas[0], detalles);
};

const restoreVentaStock = async (runner, ventaId) => {
  const [detalles] = await runner.query(
    `SELECT producto_id, cantidad
       FROM venta_detalles
      WHERE venta_id = ?`,
    [ventaId]
  );

  for (const detalle of detalles) {
    const productoId = Number(detalle.producto_id);
    const cantidad = Number(detalle.cantidad || 0);
    if (!Number.isInteger(productoId) || productoId <= 0 || cantidad <= 0) continue;
    await runner.execute(
      'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
      [cantidad, productoId]
    );
  }
};

const getAuthType = (req) => String(req.auth?.type || '').trim().toLowerCase();
const getAuthSub = (req) => Number(req.auth?.sub);

const listVentas = async (_req, res) => {
  await ensureVentaOptionalColumns();
  const [ventas] = await pool.query(
    `SELECT id, total, metodo_pago, recibido, vuelto, cliente_id, cliente_dni, cliente_nombre,
            pedido_estado, pedido_updated_at, direccion_entrega, ubicacion_lat, ubicacion_lng, pedido_rechazo_motivo,
            vendedor_id, vendedor_usuario, vendedor_nombre, repartidor_id, repartidor_asignado_at,
            pago_referencia, pago_confirmado_at, fecha
       FROM ventas ORDER BY fecha DESC`
  );

  if (ventas.length === 0) {
    return res.json([]);
  }

  const ventaIds = ventas.map((venta) => venta.id);
  const [detalles] = await pool.query(
    `SELECT vd.venta_id, vd.producto_id, vd.cantidad, vd.precio_unitario, vd.subtotal,
            p.nombre, p.descripcion, p.precio_venta, p.stock_actual, p.categoria_id, p.imagen
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

  const payload = ventas.map((venta) => mapVenta(venta, detallePorVenta[venta.id] || []));
  res.json(payload);
};

const listVentasByCliente = async (req, res) => {
  await ensureVentaOptionalColumns();
  const clienteId = Number(req.params.clienteId);
  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    return res.status(400).json({ message: 'clienteId inválido.' });
  }
  if (getAuthType(req) === 'cliente' && getAuthSub(req) !== clienteId) {
    return res.status(403).json({ message: 'No autorizado para ver pedidos de otro cliente.' });
  }

  const [ventas] = await pool.query(
    `SELECT id, total, metodo_pago, recibido, vuelto, cliente_id, cliente_dni, cliente_nombre,
            pedido_estado, pedido_updated_at, direccion_entrega, ubicacion_lat, ubicacion_lng, pedido_rechazo_motivo,
            vendedor_id, vendedor_usuario, vendedor_nombre, repartidor_id, repartidor_asignado_at,
            pago_referencia, pago_confirmado_at, fecha
       FROM ventas
      WHERE cliente_id = ?
      ORDER BY fecha DESC`,
    [clienteId]
  );

  if (ventas.length === 0) {
    return res.json([]);
  }

  const ventaIds = ventas.map((venta) => venta.id);
  const [detalles] = await pool.query(
    `SELECT vd.venta_id, vd.producto_id, vd.cantidad, vd.precio_unitario, vd.subtotal,
            p.nombre, p.descripcion, p.precio_venta, p.stock_actual, p.categoria_id, p.imagen
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

  const payload = ventas.map((venta) => mapVenta(venta, detallePorVenta[venta.id] || []));
  res.json(payload);
};

const listPedidos = async (req, res) => {
  await ensureVentaOptionalColumns();
  const estado = typeof req.query?.estado === 'string' ? req.query.estado.trim().toLowerCase() : '';
  const valid = new Set(['pendiente', 'creando', 'en_camino', 'entregado', 'rechazado']);
  const estadoValue = valid.has(estado) ? estado : '';

  const [ventas] = await pool.query(
    `SELECT id, total, metodo_pago, recibido, vuelto, cliente_id, cliente_dni, cliente_nombre,
            pedido_estado, pedido_updated_at, direccion_entrega, ubicacion_lat, ubicacion_lng, pedido_rechazo_motivo,
            vendedor_id, vendedor_usuario, vendedor_nombre, repartidor_id, repartidor_asignado_at, fecha
       FROM ventas
      WHERE cliente_id IS NOT NULL
        AND pedido_estado IS NOT NULL
        ${estadoValue ? 'AND LOWER(pedido_estado) = ?' : ''}
      ORDER BY fecha DESC`,
    estadoValue ? [estadoValue] : []
  );

  if (ventas.length === 0) {
    return res.json([]);
  }

  const ventaIds = ventas.map((venta) => venta.id);
  const [detalles] = await pool.query(
    `SELECT vd.venta_id, vd.producto_id, vd.cantidad, vd.precio_unitario, vd.subtotal,
            p.nombre, p.descripcion, p.precio_venta, p.stock_actual, p.categoria_id, p.imagen
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

const updatePedidoEstado = async (req, res) => {
  await ensureVentaOptionalColumns();
  await ensureRepartoSchema();
  const ventaId = Number(req.params.ventaId);
  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ message: 'ventaId inválido.' });
  }

  const estado = String(req.body?.estado || '').trim().toLowerCase();
  const motivo = String(req.body?.motivo || '').trim();
  const valid = new Set(['pendiente', 'creando', 'en_camino', 'entregado', 'rechazado']);
  if (!valid.has(estado)) {
    return res.status(400).json({ message: 'Estado inválido.' });
  }

  const motivoValue = estado === 'rechazado' ? (motivo || 'Rechazado') : null;
  const authType = getAuthType(req);
  const authSub = getAuthSub(req);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, pedido_estado, cliente_id, repartidor_id
         FROM ventas
        WHERE id = ?
        LIMIT 1
        FOR UPDATE`,
      [ventaId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    const ventaRow = rows[0];
    const prevEstado = String(ventaRow.pedido_estado || '').trim().toLowerCase();

    if (authType === 'cliente') {
      if (!Number.isInteger(authSub) || authSub <= 0 || Number(ventaRow.cliente_id || 0) !== authSub) {
        await connection.rollback();
        return res.status(403).json({ message: 'No autorizado para actualizar este pedido.' });
      }
      if (estado !== 'rechazado') {
        await connection.rollback();
        return res.status(403).json({ message: 'Como cliente solo puedes cancelar tu pedido.' });
      }
      if (!new Set(['pendiente', 'creando']).has(prevEstado)) {
        await connection.rollback();
        return res.status(409).json({ message: 'Este pedido ya no puede ser cancelado por el cliente.' });
      }
    }

    if (authType === 'repartidor') {
      if (!Number.isInteger(authSub) || authSub <= 0 || Number(ventaRow.repartidor_id || 0) !== authSub) {
        await connection.rollback();
        return res.status(403).json({ message: 'No autorizado para actualizar este pedido.' });
      }
      if (!new Set(['en_camino', 'entregado']).has(estado)) {
        await connection.rollback();
        return res.status(403).json({ message: 'El repartidor solo puede marcar el pedido en camino o entregado.' });
      }
      if (estado === 'en_camino' && !new Set(['pendiente', 'creando', 'en_camino']).has(prevEstado)) {
        await connection.rollback();
        return res.status(409).json({ message: 'El pedido no puede pasar a en camino desde su estado actual.' });
      }
      if (estado === 'entregado' && prevEstado !== 'en_camino') {
        await connection.rollback();
        return res.status(409).json({ message: 'El pedido debe estar en camino antes de marcarse como entregado.' });
      }
    }

    const isRejectingNow = estado === 'rechazado' && prevEstado !== 'rechazado';

    const [result] = await connection.execute(
      `UPDATE ventas
          SET pedido_estado = ?,
              pedido_updated_at = CURRENT_TIMESTAMP,
              pedido_rechazo_motivo = ?
        WHERE id = ?`,
      [estado, motivoValue, ventaId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    if (isRejectingNow) {
      await restoreVentaStock(connection, ventaId);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    return res.status(400).json({ message: error.message || 'No se pudo actualizar el pedido.' });
  } finally {
    connection.release();
  }

  const venta = await fetchVentaById(ventaId);

  // Si se cierra el pedido, liberar repartidor (si existe).
  const shouldRelease = estado === 'entregado' || estado === 'rechazado';
  if (shouldRelease && venta?.repartidorId) {
    await pool.execute(
      "UPDATE usuarios SET repartidor_estado = 'libre' WHERE id = ? AND UPPER(rol) = 'REPARTIDOR'",
      [venta.repartidorId]
    );
  }
  res.json(venta);
};

const createVenta = async (req, res) => {
  const {
    productosVendidos,
    total,
    totalExtra,
    metodoPago,
    recibido,
    vuelto,
    pagoReferencia,
    clienteId,
    clienteDni,
    clienteNombre,
    direccionEntrega,
    ubicacionLat,
    ubicacionLng,
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
    const cleanVendedorUsuario = typeof vendedorUsuario === 'string' ? vendedorUsuario.trim() : '';
    const cleanVendedorNombre = typeof vendedorNombre === 'string' ? vendedorNombre.trim() : '';
    const vendedorIdParsed = Number(vendedorId);
    let vendedorIdValue = Number.isInteger(vendedorIdParsed) && vendedorIdParsed > 0
      ? vendedorIdParsed
      : null;
    const clienteIdParsed = Number(clienteId);
    let clienteIdValue = Number.isInteger(clienteIdParsed) && clienteIdParsed > 0
      ? clienteIdParsed
      : null;
    const direccionEntregaValue = typeof direccionEntrega === 'string' ? direccionEntrega.trim() : '';
    const lat = ubicacionLat === null || ubicacionLat === undefined || ubicacionLat === '' ? null : Number(ubicacionLat);
    const lng = ubicacionLng === null || ubicacionLng === undefined || ubicacionLng === '' ? null : Number(ubicacionLng);
    const cleanPagoReferencia = typeof pagoReferencia === 'string' ? pagoReferencia.trim() : '';
    const metodoLower = String(metodoPago || 'efectivo').toLowerCase();
    const requestedTotal = total === null || total === undefined || total === '' ? null : Number(total);
    const totalExtraParsed = totalExtra === null || totalExtra === undefined || totalExtra === '' ? 0 : Number(totalExtra);
    const recibidoParsed = recibido === null || recibido === undefined || recibido === '' ? null : Number(recibido);
    const vueltoParsed = vuelto === null || vuelto === undefined || vuelto === '' ? null : Number(vuelto);
    const authType = getAuthType(req);
    const authSub = getAuthSub(req);
    // Mantener compatibilidad: en ventas internas se puede usar "yape" sin enviar código.
    const shouldConfirmPago = metodoLower === 'yape' && !!cleanPagoReferencia;

    if (authType === 'cliente') {
      if (!Number.isInteger(authSub) || authSub <= 0) {
        throw new Error('Token de cliente inválido.');
      }
      if (clienteIdValue && clienteIdValue !== authSub) {
        throw new Error('No autorizado para registrar pedidos de otro cliente.');
      }
      clienteIdValue = authSub;
      vendedorIdValue = null;
      if (cleanVendedorUsuario || cleanVendedorNombre) {
        throw new Error('Un cliente no puede registrar datos de vendedor.');
      }
    }

    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      throw new Error('Latitud inválida.');
    }
    if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      throw new Error('Longitud inválida.');
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
    if (metodoLower === 'efectivo_contra_entrega' && !clienteIdValue) {
      throw new Error('Ese método de pago solo puede usarse en pedidos de cliente.');
    }
    if (metodoLower === 'efectivo_contra_entrega' && !direccionEntregaValue) {
      throw new Error('La dirección de entrega es obligatoria para delivery.');
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
        'SELECT id, nombre, stock_actual, precio_venta FROM productos WHERE id = ? FOR UPDATE',
        [productoId]
      );

      if (productoRows.length === 0) {
        throw new Error(`Producto ${productoId} no encontrado.`);
      }

      const producto = productoRows[0];
      if (producto.stock_actual < cantidad) {
        throw new Error(`Stock insuficiente para ${producto.nombre}.`);
      }

      const precioUnitario = Number(producto.precio_venta);
      const subtotal = Number(precioUnitario) * cantidad;
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

    const isPedidoCliente = !!clienteIdValue && !vendedorIdValue;
    const pedidoEstadoValue = isPedidoCliente ? 'pendiente' : null;

    const [ventaResult] = await connection.execute(
      `INSERT INTO ventas (
        total, metodo_pago, recibido, vuelto, cliente_id, cliente_dni, cliente_nombre,
        pedido_estado, pedido_updated_at, direccion_entrega, ubicacion_lat, ubicacion_lng,
        vendedor_id, vendedor_usuario, vendedor_nombre,
        pago_referencia, pago_confirmado_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        totalCalculado,
        metodoPago || 'efectivo',
        recibidoValue,
        vueltoValue,
        clienteIdValue,
        cleanDni || null,
        cleanNombre || null,
        pedidoEstadoValue,
        direccionEntregaValue || null,
        Number.isFinite(lat) ? lat : null,
        Number.isFinite(lng) ? lng : null,
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

const deleteVentas = async (_req, res) => {
  const connection = await pool.getConnection();
  let fkDisabled = false;
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    fkDisabled = true;
    await connection.query('TRUNCATE TABLE venta_detalles');
    await connection.query('TRUNCATE TABLE ventas');
    await connection.query('ALTER TABLE ventas AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE venta_detalles AUTO_INCREMENT = 1');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    fkDisabled = false;
  } finally {
    if (fkDisabled) {
      try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (_error) {
        // ignore restore error
      }
    }
    connection.release();
  }
  res.status(204).send();
};

const deleteVentasBatch = async (req, res) => {
  const rawIds = req.body?.ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return res.status(400).json({ message: 'Debes enviar un arreglo de IDs.' });
  }

  const ids = [...new Set(
    rawIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  )];

  if (ids.length === 0) {
    return res.status(400).json({ message: 'No se recibieron IDs válidos.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM venta_detalles WHERE venta_id IN (?)', [ids]);
    const [result] = await connection.query('DELETE FROM ventas WHERE id IN (?)', [ids]);
    await resetVentasAutoIncrementIfEmpty(connection);
    await connection.commit();
    return res.json({ deleted: Number(result.affectedRows || 0), ids });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  listVentas,
  listVentasByCliente,
  listPedidos,
  updatePedidoEstado,
  createVenta,
  deleteVentas,
  deleteVentasBatch
};
