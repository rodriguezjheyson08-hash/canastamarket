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
const { registrarAuditoria } = require('../features/auditoria/service');
const { registrarMovimientoInventario } = require('../features/inventario/service');
const { ensureCajasSchema } = require('../features/cajas/schema');
const { getPayment } = require('../pagos/mercadopagoService');
const {
  getPublicKey,
  saveSubscription,
  notifyPedidoOnlineCreated
} = require('../features/pushNotifications/service');
const { sendPedidoOnlineBoleta } = require('../services/emailService');

const ESTADOS_VALIDOS = new Set(['PENDIENTE_RECOJO', 'PENDIENTE_PAGO', 'PAGADO', 'RECOGIDO', 'ANULADO']);
const METODOS_VALIDOS = new Set(['RECOJO', 'MERCADO_PAGO']);
const METODOS_RECOJO_VALIDOS = new Set(['efectivo', 'yape', 'mercadopago_link', 'tarjeta', 'mixto_efectivo_yape']);

const cleanText = (value, maxLength = 255) => String(value ?? '').trim().slice(0, maxLength);

const paymentAmountMatches = (expected, paid) => Math.abs(Number(expected || 0) - Number(paid || 0)) <= 0.01;

const metodoPagoLabel = (metodo) => {
  const key = cleanText(metodo, 40).toLowerCase();
  if (key === 'efectivo') return 'Efectivo';
  if (key === 'yape') return 'Yape';
  if (key === 'mercadopago_link') return 'Mercado Pago link';
  if (key === 'tarjeta') return 'Tarjeta';
  if (key === 'mixto_efectivo_yape') return 'Mixto: efectivo + Yape';
  if (key === 'MERCADO_PAGO'.toLowerCase()) return 'Mercado Pago';
  return metodo || 'Al recoger';
};

const actualizarBoletaPago = (boletaHtml, metodo) => {
  if (!boletaHtml) return boletaHtml;
  const label = metodoPagoLabel(metodo);
  return String(boletaHtml)
    .replace(/(<strong>Pago:<\/strong>\s*)Al recoger/gi, `$1${label}`)
    .replace(/(Pago:\s*)Al recoger/gi, `$1${label}`);
};

const fetchPedidoById = async (pedidoId, runner = pool) => {
  await ensurePedidosOnlineSchema(runner);

  const [pedidos] = await runner.query(
    `SELECT id, codigo, fecha, estado, metodo_pago, entrega, cliente_nombre, cliente_dni, cliente_email,
            cliente_telefono, cliente_direccion, total, boleta_html, pago_referencia,
            pago_recogida_metodo, pago_recogida_recibido, pago_recogida_vuelto, pago_recogida_detalle, pago_recogida_at,
            cancelado_por, cancelado_at, cancelacion_motivo, reembolso_estado
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
            cliente_telefono, cliente_direccion, total, boleta_html, pago_referencia,
            pago_recogida_metodo, pago_recogida_recibido, pago_recogida_vuelto, pago_recogida_detalle, pago_recogida_at,
            cancelado_por, cancelado_at, cancelacion_motivo, reembolso_estado
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
            cliente_telefono, cliente_direccion, total, boleta_html, pago_referencia,
            pago_recogida_metodo, pago_recogida_recibido, pago_recogida_vuelto, pago_recogida_detalle, pago_recogida_at,
            cancelado_por, cancelado_at, cancelacion_motivo, reembolso_estado
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

const getPedidoOnlinePushPublicKey = async (req, res) => {
  res.json({ publicKey: getPublicKey() });
};

const subscribePedidoOnlinePush = async (req, res) => {
  await saveSubscription({
    usuarioId: req.auth?.sub,
    subscription: req.body?.subscription || req.body,
    userAgent: req.headers['user-agent']
  });
  res.status(204).send();
};

const sendPedidoOnlineBoletaEmail = async (pedido) => {
  const email = pedido?.cliente?.email || pedido?.cliente_email;
  await sendPedidoOnlineBoleta({ to: email, pedido });
};

const enviarPedidoOnlineBoletaEmail = async (req, res) => {
  const pedidoId = Number(req.params.id);
  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ message: 'Pedido invalido.' });
  }
  const pedido = await fetchPedidoById(pedidoId);
  if (!pedido) {
    return res.status(404).json({ message: 'Pedido online no encontrado.' });
  }
  await sendPedidoOnlineBoletaEmail(pedido);
  res.json({ message: `Boleta enviada a ${pedido.cliente.email}.` });
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
            cliente_telefono, cliente_direccion, total, boleta_html, pago_referencia,
            pago_recogida_metodo, pago_recogida_recibido, pago_recogida_vuelto, pago_recogida_detalle, pago_recogida_at,
            cancelado_por, cancelado_at, cancelacion_motivo, reembolso_estado
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
  const cleanPagoReferencia = cleanText(pagoReferencia, 120);

  if (!ESTADOS_VALIDOS.has(cleanEstado)) {
    return res.status(400).json({ message: 'Estado de pedido inválido.' });
  }
  if (!METODOS_VALIDOS.has(cleanMetodo)) {
    return res.status(400).json({ message: 'Método de pago inválido.' });
  }
  if (cleanMetodo === 'MERCADO_PAGO' && cleanEstado !== 'PAGADO') {
    return res.status(400).json({ message: 'El pedido con Mercado Pago solo se registra cuando el pago esta aprobado.' });
  }
  if (cleanMetodo === 'MERCADO_PAGO' && !cleanPagoReferencia) {
    return res.status(400).json({ message: 'Falta la referencia real del pago de Mercado Pago.' });
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

    if (cleanMetodo === 'MERCADO_PAGO') {
      const pago = await getPayment(cleanPagoReferencia);
      if (pago.status !== 'approved') {
        throw new Error(`Mercado Pago no confirmo el pago. Estado actual: ${pago.status || 'desconocido'}.`);
      }
      if (!paymentAmountMatches(totalCalculado, Number(pago.transaction_amount))) {
        throw new Error('El monto pagado en Mercado Pago no coincide con el total del pedido.');
      }
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
        cleanPagoReferencia || null
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
      await registrarMovimientoInventario(connection, {
        req,
        productoId: detalle.productoId,
        tipo: 'PEDIDO_ONLINE',
        cantidad: detalle.cantidad,
        direccion: 'SALIDA',
        referenciaTipo: 'PEDIDO_ONLINE',
        referenciaId: pedidoId,
        motivo: `Pedido online ${cleanCodigo}`
      });
    }

    await registrarAuditoria(connection, {
      req,
      accion: 'PEDIDO_ONLINE_CREADO',
      entidad: 'pedido_online',
      entidadId: pedidoId,
      detalle: { codigo: cleanCodigo, total: totalCalculado, productos: detalles.length }
    });

    await connection.commit();
    const pedido = await fetchPedidoById(pedidoId);
    res.status(201).json(pedido);
    setTimeout(() => {
      void notifyPedidoOnlineCreated({ codigo: cleanCodigo, total: totalCalculado });
      void sendPedidoOnlineBoletaEmail(pedido).catch(() => undefined);
    }, 0);
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

const calcularReembolsoEstado = (pedido) => {
  if (pedido.metodo_pago !== 'MERCADO_PAGO') return null;
  if (['PAGADO', 'RECOGIDO'].includes(pedido.estado)) return 'PENDIENTE_MANUAL';
  return 'NO_CAPTURADO';
};

const anularPedidoOnlineTransaccion = async (connection, { req, pedidoId, actor, motivo }) => {
  const [pedidos] = await connection.query(
    'SELECT id, estado, metodo_pago, reembolso_estado FROM pedidos_online WHERE id = ? FOR UPDATE',
    [pedidoId]
  );
  if (pedidos.length === 0) {
    const error = new Error('Pedido online no encontrado.');
    error.status = 404;
    throw error;
  }

  const pedido = pedidos[0];
  if (pedido.estado === 'ANULADO') {
    return { estadoAnterior: pedido.estado, reembolsoEstado: pedido.reembolso_estado || null, yaAnulado: true };
  }
  if (pedido.estado === 'RECOGIDO') {
    throw new Error('No se puede cancelar un pedido ya recogido.');
  }

  const [detalles] = await connection.query(
    'SELECT producto_id, cantidad FROM pedidos_online_detalles WHERE pedido_id = ?',
    [pedidoId]
  );
  for (const detalle of detalles) {
    await registrarMovimientoInventario(connection, {
      req,
      productoId: detalle.producto_id,
      tipo: 'ANULACION_PEDIDO_ONLINE',
      cantidad: Number(detalle.cantidad),
      direccion: 'ENTRADA',
      referenciaTipo: 'PEDIDO_ONLINE',
      referenciaId: pedidoId,
      motivo
    });
  }

  const reembolsoEstado = calcularReembolsoEstado(pedido);
  await connection.execute(
    `UPDATE pedidos_online
        SET estado = 'ANULADO',
            cancelado_por = ?,
            cancelado_at = CURRENT_TIMESTAMP,
            cancelacion_motivo = ?,
            reembolso_estado = ?
      WHERE id = ?`,
    [actor, motivo, reembolsoEstado, pedidoId]
  );

  await registrarAuditoria(connection, {
    req,
    accion: 'PEDIDO_ONLINE_ANULADO',
    entidad: 'pedido_online',
    entidadId: pedidoId,
    detalle: { estadoAnterior: pedido.estado, estadoNuevo: 'ANULADO', motivo, actor, reembolsoEstado }
  });

  return { estadoAnterior: pedido.estado, reembolsoEstado, yaAnulado: false };
};

// CONTROLADOR ADMIN - CAMBIAR ESTADO:
// Permite marcar un pedido como recogido, pagado o anulado desde el modulo interno.
const updatePedidoOnlineEstado = async (req, res) => {
  await ensurePedidosOnlineSchema();
  const pedidoId = Number(req.params.id);
  const estado = cleanText(req.body.estado, 30);
  const motivo = cleanText(req.body.motivo || 'Cambio de estado de pedido online', 255);
  const pagoRecogidaMetodo = cleanText(req.body.pagoRecogidaMetodo, 40).toLowerCase();
  const pagoRecogidaRecibido = req.body.pagoRecogidaRecibido === undefined || req.body.pagoRecogidaRecibido === null || req.body.pagoRecogidaRecibido === ''
    ? null
    : Number(req.body.pagoRecogidaRecibido);
  const pagoMixtoEfectivo = req.body.pagoMixtoEfectivo === undefined || req.body.pagoMixtoEfectivo === null || req.body.pagoMixtoEfectivo === ''
    ? 0
    : Number(req.body.pagoMixtoEfectivo);
  const pagoMixtoYape = req.body.pagoMixtoYape === undefined || req.body.pagoMixtoYape === null || req.body.pagoMixtoYape === ''
    ? 0
    : Number(req.body.pagoMixtoYape);

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ message: 'Pedido inválido.' });
  }
  if (!ESTADOS_VALIDOS.has(estado)) {
    return res.status(400).json({ message: 'Estado inválido.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await ensurePedidosOnlineSchema(connection);

    if (estado === 'ANULADO') {
      await anularPedidoOnlineTransaccion(connection, { req, pedidoId, actor: 'ADMIN', motivo });
    } else {
      const [pedidos] = await connection.query(
        'SELECT id, estado, metodo_pago, total, boleta_html FROM pedidos_online WHERE id = ? FOR UPDATE',
        [pedidoId]
      );
      if (pedidos.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Pedido online no encontrado.' });
      }

      const estadoAnterior = pedidos[0].estado;
      if (estadoAnterior === 'ANULADO') {
        await connection.rollback();
        return res.status(400).json({ message: 'No se puede reactivar un pedido anulado.' });
      }

      const pedido = pedidos[0];
      if (estado === 'RECOGIDO' && pedido.metodo_pago === 'RECOJO') {
        await ensureCajasSchema(connection);
        const [cajas] = await connection.query(
          "SELECT id FROM caja_sesiones WHERE usuario_id = ? AND estado = 'ABIERTA' ORDER BY id DESC LIMIT 1 FOR UPDATE",
          [Number(req.auth?.sub)]
        );
        if (cajas.length === 0) {
          await connection.rollback();
          return res.status(409).json({ message: 'Debes abrir caja antes de cobrar un pedido online al recoger.' });
        }
        const cajaSesionId = Number(cajas[0].id);
        if (!METODOS_RECOJO_VALIDOS.has(pagoRecogidaMetodo)) {
          await connection.rollback();
          return res.status(400).json({ message: 'Indica como pago el cliente al recoger.' });
        }
        const totalPedido = Number(pedido.total || 0);
        const esMixto = pagoRecogidaMetodo === 'mixto_efectivo_yape';
        const recibido = esMixto
          ? Number((pagoMixtoEfectivo + pagoMixtoYape).toFixed(2))
          : pagoRecogidaMetodo === 'efectivo'
            ? pagoRecogidaRecibido
            : totalPedido;
        if (!Number.isFinite(recibido) || recibido < totalPedido) {
          await connection.rollback();
          return res.status(400).json({ message: 'El monto recibido no cubre el total del pedido.' });
        }
        const vuelto = ['efectivo', 'mixto_efectivo_yape'].includes(pagoRecogidaMetodo) ? Number((recibido - totalPedido).toFixed(2)) : 0;
        const detallePago = esMixto
          ? { efectivo: pagoMixtoEfectivo, yape: pagoMixtoYape }
          : null;
        await connection.execute(
          `UPDATE pedidos_online
              SET estado = ?,
                  pago_recogida_metodo = ?,
                  pago_recogida_recibido = ?,
                  pago_recogida_vuelto = ?,
                  pago_recogida_detalle = ?,
                  pago_recogida_at = CURRENT_TIMESTAMP,
                  caja_sesion_id = ?,
                  boleta_html = ?
            WHERE id = ?`,
          [
            estado,
            pagoRecogidaMetodo,
            recibido,
            vuelto,
            detallePago ? JSON.stringify(detallePago) : null,
            cajaSesionId,
            actualizarBoletaPago(pedido.boleta_html, pagoRecogidaMetodo),
            pedidoId
          ]
        );
      } else {
        await connection.execute('UPDATE pedidos_online SET estado = ? WHERE id = ?', [estado, pedidoId]);
      }
      await registrarAuditoria(connection, {
        req,
        accion: 'PEDIDO_ONLINE_CAMBIO_ESTADO',
        entidad: 'pedido_online',
        entidadId: pedidoId,
        detalle: { estadoAnterior, estadoNuevo: estado, motivo, pagoRecogidaMetodo: pagoRecogidaMetodo || null }
      });
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    return res.status(400).json({ message: error.message || 'No se pudo actualizar el pedido online.' });
  } finally {
    connection.release();
  }

  const pedido = await fetchPedidoById(pedidoId);
  res.json(pedido);
};

const cancelarPedidoOnlineCliente = async (req, res) => {
  await ensurePedidosOnlineSchema();
  const pedidoId = Number(req.params.id);
  const motivo = cleanText(req.body?.motivo || 'Cancelado por el cliente', 255);

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ message: 'Pedido invalido.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await ensurePedidosOnlineSchema(connection);

    const [clienteRows] = await connection.query(
      'SELECT email FROM clientes WHERE id = ? AND is_active = 1 LIMIT 1',
      [req.auth.sub]
    );
    if (!clienteRows[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    const [ownerRows] = await connection.query(
      'SELECT id FROM pedidos_online WHERE id = ? AND cliente_email = ? LIMIT 1',
      [pedidoId, clienteRows[0].email]
    );
    if (!ownerRows[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pedido online no encontrado.' });
    }

    await anularPedidoOnlineTransaccion(connection, { req, pedidoId, actor: 'CLIENTE', motivo });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    return res.status(error.status || 400).json({ message: error.message || 'No se pudo cancelar el pedido.' });
  } finally {
    connection.release();
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
  getPedidoOnlinePushPublicKey,
  subscribePedidoOnlinePush,
  enviarPedidoOnlineBoletaEmail,
  updatePedidoOnlineEstado,
  cancelarPedidoOnlineCliente,
  getPedidoOnlineByCodigo
};
