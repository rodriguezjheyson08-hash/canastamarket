/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/pedidosOnlineController.js
 * QUE HACE: Registra pedidos de clientes web y permite que admin/cajero los consulte.
 * GUIA: PUBLICO registra compra; ADMIN lista y cambia estado.
 */
const pool = require('../db/pool');
const { productAvailabilitySql } = require('../utils/catalogAvailability');
const { ensurePedidosOnlineSchema } = require('../features/pedidosOnline/schema');
const { mapPedidoOnline } = require('../features/pedidosOnline/mappers');

const ESTADOS_VALIDOS = new Set(['PENDIENTE_RECOJO', 'PENDIENTE_PAGO', 'PAGADO', 'RECOGIDO', 'ANULADO']);
const METODOS_VALIDOS = new Set(['RECOJO', 'MERCADO_PAGO']);

const cleanText = (value, maxLength = 255) => String(value ?? '').trim().slice(0, maxLength);

const fetchPedidoById = async (pedidoId, runner = pool) => {
  await ensurePedidosOnlineSchema(runner);

  const [pedidos] = await runner.query(
    `SELECT id, codigo, fecha, estado, metodo_pago, entrega, cliente_nombre, cliente_dni, cliente_email,
            cliente_telefono, cliente_direccion, total, boleta_html, pago_referencia
       FROM pedidos_online
      WHERE id = ?`,
    [pedidoId]
  );
  if (pedidos.length === 0) return null;

  const [detalles] = await runner.query(
    `SELECT pedido_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal
       FROM pedidos_online_detalles
      WHERE pedido_id = ?
      ORDER BY id ASC`,
    [pedidoId]
  );

  return mapPedidoOnline(pedidos[0], detalles);
};

const fetchPedidoByCodigo = async (codigo) => {
  await ensurePedidosOnlineSchema();

  const [pedidos] = await pool.query(
    `SELECT id, codigo, fecha, estado, metodo_pago, entrega, cliente_nombre, cliente_dni, cliente_email,
            cliente_telefono, cliente_direccion, total, boleta_html, pago_referencia
       FROM pedidos_online
      WHERE codigo = ?
      LIMIT 1`,
    [codigo]
  );
  if (pedidos.length === 0) return null;
  const [detalles] = await pool.query(
    `SELECT pedido_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal
       FROM pedidos_online_detalles
      WHERE pedido_id = ?
      ORDER BY id ASC`,
    [pedidos[0].id]
  );
  return mapPedidoOnline(pedidos[0], detalles);
};

// CONTROLADOR ADMIN - LISTAR PEDIDOS ONLINE:
// Lo usa Ventas para mostrar una bandeja de pedidos recibidos desde /cliente.
const listPedidosOnline = async (req, res) => {
  await ensurePedidosOnlineSchema();

  const estado = cleanText(req.query.estado, 30);
  const params = [];
  let where = '';
  if (estado) {
    where = 'WHERE estado = ?';
    params.push(estado);
  }

  const [pedidos] = await pool.query(
    `SELECT id, codigo, fecha, estado, metodo_pago, entrega, cliente_nombre, cliente_dni, cliente_email,
            cliente_telefono, cliente_direccion, total, boleta_html, pago_referencia
       FROM pedidos_online
       ${where}
      ORDER BY fecha DESC
      LIMIT 100`,
    params
  );

  if (pedidos.length === 0) {
    return res.json([]);
  }

  const pedidoIds = pedidos.map((pedido) => pedido.id);
  const [detalles] = await pool.query(
    `SELECT pedido_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal
       FROM pedidos_online_detalles
      WHERE pedido_id IN (?)
      ORDER BY id ASC`,
    [pedidoIds]
  );

  const detallePorPedido = detalles.reduce((acc, detalle) => {
    if (!acc[detalle.pedido_id]) acc[detalle.pedido_id] = [];
    acc[detalle.pedido_id].push(detalle);
    return acc;
  }, {});

  res.json(pedidos.map((pedido) => mapPedidoOnline(pedido, detallePorPedido[pedido.id] || [])));
};

// CONTROLADOR PUBLICO - HISTORIAL DEL CLIENTE:
// Permite que /cliente vea el estado actualizado de sus propios pedidos por correo.
const listPedidosOnlinePublic = async (req, res) => {
  await ensurePedidosOnlineSchema();
  const email = cleanText(req.query.email, 160).toLowerCase();
  if (!email) {
    return res.json([]);
  }

  const [pedidos] = await pool.query(
    `SELECT id, codigo, fecha, estado, metodo_pago, entrega, cliente_nombre, cliente_dni, cliente_email,
            cliente_telefono, cliente_direccion, total, boleta_html, pago_referencia
       FROM pedidos_online
      WHERE cliente_email = ?
      ORDER BY fecha DESC
      LIMIT 50`,
    [email]
  );

  if (pedidos.length === 0) {
    return res.json([]);
  }

  const pedidoIds = pedidos.map((pedido) => pedido.id);
  const [detalles] = await pool.query(
    `SELECT pedido_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal
       FROM pedidos_online_detalles
      WHERE pedido_id IN (?)
      ORDER BY id ASC`,
    [pedidoIds]
  );

  const detallePorPedido = detalles.reduce((acc, detalle) => {
    if (!acc[detalle.pedido_id]) acc[detalle.pedido_id] = [];
    acc[detalle.pedido_id].push(detalle);
    return acc;
  }, {});

  res.json(pedidos.map((pedido) => mapPedidoOnline(pedido, detallePorPedido[pedido.id] || [])));
};

const listPedidosOnlineMine = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT email FROM clientes WHERE id = ? AND is_active = 1 LIMIT 1',
    [req.auth.sub]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Cliente no encontrado.' });
  req.query.email = rows[0].email;
  return listPedidosOnlinePublic(req, res);
};

// CONTROLADOR PUBLICO - CREAR PEDIDO ONLINE:
// Valida stock en MySQL, descuenta inventario y deja el pedido visible para admin/cajero.
const createPedidoOnlinePublic = async (req, res) => {
  const {
    codigo,
    estado,
    metodoPago,
    entrega,
    cliente,
    productos,
    total,
    boletaHtml,
    pagoReferencia
  } = req.body;

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ message: 'Debe enviar productos para el pedido.' });
  }

  const cleanCodigo = cleanText(codigo || `WEB-${Date.now()}`, 40);
  const cleanEstado = cleanText(estado || 'PENDIENTE_RECOJO', 30);
  const cleanMetodo = cleanText(metodoPago || 'RECOJO', 40);
  const cleanEntrega = cleanText(entrega || 'RECOJO_TIENDA', 40);
  const clienteNombre = cleanText(cliente?.nombre, 160);
  const clienteDni = cleanText(cliente?.dni, 8).replace(/\D/g, '');
  const clienteEmail = cleanText(cliente?.email, 160).toLowerCase();
  const clienteTelefono = cleanText(cliente?.telefono, 40);
  const clienteDireccion = cleanText(cliente?.direccion, 255);
  const requestedTotal = Number(total);

  if (!ESTADOS_VALIDOS.has(cleanEstado)) {
    return res.status(400).json({ message: 'Estado de pedido inválido.' });
  }
  if (!METODOS_VALIDOS.has(cleanMetodo)) {
    return res.status(400).json({ message: 'Método de pago inválido.' });
  }
  if (!clienteNombre || !clienteDni || !clienteEmail || !clienteTelefono) {
    return res.status(400).json({ message: 'Nombre, DNI, correo y teléfono del cliente son obligatorios.' });
  }
  if (!/^\d{8}$/.test(clienteDni)) {
    return res.status(400).json({ message: 'El DNI del cliente debe tener 8 dígitos.' });
  }
  if (!Number.isFinite(requestedTotal) || requestedTotal <= 0) {
    return res.status(400).json({ message: 'Total de pedido inválido.' });
  }

  const connection = await pool.getConnection();

  try {
    await ensurePedidosOnlineSchema(connection);
    await connection.beginTransaction();

    const [duplicados] = await connection.query('SELECT id FROM pedidos_online WHERE codigo = ? LIMIT 1', [cleanCodigo]);
    if (duplicados.length > 0) {
      await connection.rollback();
      const pedidoExistente = await fetchPedidoById(duplicados[0].id);
      return res.status(200).json(pedidoExistente);
    }

    const detalles = [];
    let detallesTotal = 0;

    for (const item of productos) {
      const productoId = Number(item.id || item.productoId);
      const cantidad = Number(item.cantidad || 0);
      if (!Number.isInteger(productoId) || productoId <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error('Producto o cantidad inválida en el pedido.');
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
        throw new Error(`Producto ${productoId} no disponible.`);
      }

      const producto = productoRows[0];
      if (Number(producto.stock_actual) < cantidad) {
        throw new Error(`Stock insuficiente para ${producto.nombre}.`);
      }

      const precioUnitario = Number(producto.precio_venta);
      const subtotal = Number((precioUnitario * cantidad).toFixed(2));
      detallesTotal += subtotal;
      detalles.push({
        productoId,
        nombre: producto.nombre,
        cantidad,
        precioUnitario,
        subtotal
      });
    }

    const totalCalculado = Number(detallesTotal.toFixed(2));
    if (Math.abs(totalCalculado - requestedTotal) > 0.01) {
      throw new Error('Total inválido. Revisa el carrito.');
    }

    const [pedidoResult] = await connection.execute(
      `INSERT INTO pedidos_online (
        codigo, estado, metodo_pago, entrega, cliente_nombre, cliente_dni, cliente_email,
        cliente_telefono, cliente_direccion, total, boleta_html, pago_referencia
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanCodigo,
        cleanEstado,
        cleanMetodo,
        cleanEntrega,
        clienteNombre,
        clienteDni,
        clienteEmail,
        clienteTelefono || null,
        clienteDireccion || null,
        totalCalculado,
        cleanText(boletaHtml, 5_000_000) || null,
        cleanText(pagoReferencia, 120) || null
      ]
    );

    const pedidoId = pedidoResult.insertId;
    for (const detalle of detalles) {
      await connection.execute(
        `INSERT INTO pedidos_online_detalles
          (pedido_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [pedidoId, detalle.productoId, detalle.nombre, detalle.cantidad, detalle.precioUnitario, detalle.subtotal]
      );
      await connection.execute(
        'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?',
        [detalle.cantidad, detalle.productoId]
      );
    }

    await connection.commit();
    const pedido = await fetchPedidoById(pedidoId);
    res.status(201).json(pedido);
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ message: error.message || 'No se pudo registrar el pedido online.' });
  } finally {
    connection.release();
  }
};

const createPedidoOnlineCliente = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT nombre_completo, dni, email, telefono, direccion
       FROM clientes WHERE id = ? AND is_active = 1 LIMIT 1`,
    [req.auth.sub]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Cliente no encontrado.' });
  const cliente = rows[0];
  req.body.cliente = {
    nombre: cliente.nombre_completo,
    dni: cliente.dni,
    email: cliente.email,
    telefono: cliente.telefono,
    direccion: cliente.direccion
  };
  return createPedidoOnlinePublic(req, res);
};

// CONTROLADOR ADMIN - CAMBIAR ESTADO:
// Permite marcar un pedido como recogido, pagado o anulado desde el modulo interno.
const updatePedidoOnlineEstado = async (req, res) => {
  await ensurePedidosOnlineSchema();
  const pedidoId = Number(req.params.id);
  const estado = cleanText(req.body.estado, 30);

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ message: 'Pedido inválido.' });
  }
  if (!ESTADOS_VALIDOS.has(estado)) {
    return res.status(400).json({ message: 'Estado inválido.' });
  }

  const [result] = await pool.execute('UPDATE pedidos_online SET estado = ? WHERE id = ?', [estado, pedidoId]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Pedido online no encontrado.' });
  }

  const pedido = await fetchPedidoById(pedidoId);
  res.json(pedido);
};

const getPedidoOnlineByCodigo = async (req, res) => {
  const codigo = cleanText(req.params.codigo, 40);
  const pedido = await fetchPedidoByCodigo(codigo);
  if (!pedido) {
    return res.status(404).json({ message: 'Pedido online no encontrado.' });
  }
  res.json(pedido);
};

module.exports = {
  listPedidosOnline,
  listPedidosOnlinePublic,
  createPedidoOnlinePublic,
  createPedidoOnlineCliente,
  listPedidosOnlineMine,
  updatePedidoOnlineEstado,
  getPedidoOnlineByCodigo
};
