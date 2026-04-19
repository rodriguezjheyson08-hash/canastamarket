const pool = require('../db/pool');
const { ensureRepartoSchema } = require('../utils/ensureRepartoSchema');
const { ensurePasswordColumnSchema } = require('../utils/ensurePasswordColumnSchema');
const { hashPassword } = require('../utils/passwords');

const VALID_ESTADOS_REPARTIDOR = new Set(['libre', 'ocupado', 'inactivo']);
const getAuthType = (req) => String(req.auth?.type || '').trim().toLowerCase();
const getAuthSub = (req) => Number(req.auth?.sub);

const mapRepartidorRow = (row) => ({
  id: Number(row.id),
  nombreCompleto: row.nombre_completo,
  dni: row.dni || null,
  telefono: row.telefono || null,
  email: row.email || null,
  fotoUrl: row.foto_url || null,
  motoMatricula: row.moto_matricula || null,
  estado: row.repartidor_estado || 'libre',
  lastLat: row.last_lat !== null && row.last_lat !== undefined ? Number(row.last_lat) : null,
  lastLng: row.last_lng !== null && row.last_lng !== undefined ? Number(row.last_lng) : null,
  lastSeenAt: row.last_seen_at
    ? (row.last_seen_at instanceof Date ? row.last_seen_at.toISOString() : row.last_seen_at)
    : null,
  isActive: row.is_active !== null && row.is_active !== undefined ? Boolean(row.is_active) : true
});

const mapVentaDetalleRow = (venta, detalles = []) => ({
  id: Number(venta.id),
  total: Number(venta.total),
  fecha: venta.fecha instanceof Date ? venta.fecha.toISOString() : venta.fecha,
  metodoPago: venta.metodo_pago,
  recibido: venta.recibido !== null ? Number(venta.recibido) : null,
  vuelto: venta.vuelto !== null ? Number(venta.vuelto) : null,
  clienteId: venta.cliente_id !== null && venta.cliente_id !== undefined ? Number(venta.cliente_id) : null,
  clienteDni: venta.cliente_dni || null,
  clienteNombre: venta.cliente_nombre || null,
  clienteTelefono: venta.cliente_telefono || null,
  clienteEmail: venta.cliente_email || null,
  clienteDireccionPerfil: venta.cliente_direccion || null,
  pedidoEstado: venta.pedido_estado || null,
  pedidoUpdatedAt: venta.pedido_updated_at
    ? (venta.pedido_updated_at instanceof Date ? venta.pedido_updated_at.toISOString() : venta.pedido_updated_at)
    : null,
  direccionEntrega: venta.direccion_entrega || null,
  ubicacionLat: venta.ubicacion_lat !== null && venta.ubicacion_lat !== undefined ? Number(venta.ubicacion_lat) : null,
  ubicacionLng: venta.ubicacion_lng !== null && venta.ubicacion_lng !== undefined ? Number(venta.ubicacion_lng) : null,
  pedidoRechazoMotivo: venta.pedido_rechazo_motivo || null,
  vendedorId: venta.vendedor_id !== null ? Number(venta.vendedor_id) : null,
  vendedorUsuario: venta.vendedor_usuario || null,
  vendedorNombre: venta.vendedor_nombre || null,
  repartidorId: venta.repartidor_id !== null && venta.repartidor_id !== undefined ? Number(venta.repartidor_id) : null,
  repartidorAsignadoAt: venta.repartidor_asignado_at
    ? (venta.repartidor_asignado_at instanceof Date
        ? venta.repartidor_asignado_at.toISOString()
        : venta.repartidor_asignado_at)
    : null,
  productosVendidos: detalles.map((d) => ({
    producto: {
      id: d.producto_id,
      nombre: d.nombre,
      descripcion: d.descripcion,
      precioVenta: Number(d.precio_unitario ?? d.precio_venta),
      stockActual: Number(d.stock_actual),
      categoriaId: d.categoria_id,
      imagen: d.imagen
    },
    cantidad: Number(d.cantidad)
  }))
});

const fetchVentaDetalleForRepartidor = async (ventaId) => {
  const [ventaRows] = await pool.query(
    `SELECT v.id, v.total, v.metodo_pago, v.recibido, v.vuelto, v.cliente_id, v.cliente_dni, v.cliente_nombre,
            v.pedido_estado, v.pedido_updated_at, v.direccion_entrega, v.ubicacion_lat, v.ubicacion_lng, v.pedido_rechazo_motivo,
            v.vendedor_id, v.vendedor_usuario, v.vendedor_nombre, v.repartidor_id, v.repartidor_asignado_at, v.fecha,
            c.telefono AS cliente_telefono, c.email AS cliente_email, c.direccion AS cliente_direccion
       FROM ventas v
       LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.id = ?
      LIMIT 1`,
    [ventaId]
  );

  if (ventaRows.length === 0) return null;

  const [detalles] = await pool.query(
    `SELECT vd.venta_id, vd.producto_id, vd.cantidad, vd.precio_unitario, vd.subtotal,
            p.nombre, p.descripcion, p.precio_venta, p.stock_actual, p.categoria_id, p.imagen
       FROM venta_detalles vd
       JOIN productos p ON p.id = vd.producto_id
      WHERE vd.venta_id = ?`,
    [ventaId]
  );

  return mapVentaDetalleRow(ventaRows[0], detalles);
};

const listRepartidores = async (_req, res) => {
  await ensureRepartoSchema();
  await ensurePasswordColumnSchema({ tableName: 'usuarios' });
  const [rows] = await pool.query(
    `SELECT id, nombre_completo, dni, telefono, email, foto_url, moto_matricula, repartidor_estado, last_lat, last_lng, last_seen_at, is_active
       FROM usuarios
      WHERE UPPER(rol) = 'REPARTIDOR'
      ORDER BY nombre_completo`
  );
  res.json(rows.map(mapRepartidorRow));
};

const updateRepartidorProfile = async (req, res) => {
  await ensureRepartoSchema();
  await ensurePasswordColumnSchema({ tableName: 'usuarios' });
  const repartidorId = Number(req.params.id);
  const authType = getAuthType(req);
  const authSub = getAuthSub(req);

  if (!Number.isInteger(repartidorId) || repartidorId <= 0) {
    return res.status(400).json({ message: 'repartidorId inválido.' });
  }
  if (authType === 'repartidor' && authSub !== repartidorId) {
    return res.status(403).json({ message: 'No autorizado para editar este perfil.' });
  }

  const nombreCompleto = typeof req.body?.nombreCompleto === 'string' ? req.body.nombreCompleto.trim() : '';
  const telefonoRaw = typeof req.body?.telefono === 'string' ? req.body.telefono.trim() : '';
  const telefono = telefonoRaw.replace(/\D/g, '');
  const motoMatricula = typeof req.body?.motoMatricula === 'string' ? req.body.motoMatricula.trim() : '';
  const passwordRaw = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

  if (!nombreCompleto) {
    return res.status(400).json({ message: 'El nombre completo es obligatorio.' });
  }
  if (telefono && !/^\d{9}$/.test(telefono)) {
    return res.status(400).json({ message: 'El teléfono debe tener 9 dígitos.' });
  }
  if (passwordRaw && passwordRaw.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const [rows] = await pool.query(
    `SELECT id, nombre_completo, dni, telefono, email, foto_url, moto_matricula, repartidor_estado, last_lat, last_lng, last_seen_at, is_active
       FROM usuarios
      WHERE id = ?
        AND UPPER(rol) = 'REPARTIDOR'
      LIMIT 1`,
    [repartidorId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Repartidor no encontrado.' });
  }

  await pool.execute(
    `UPDATE usuarios
        SET nombre_completo = ?,
            telefono = ?,
            moto_matricula = ?,
            password = COALESCE(?, password)
      WHERE id = ?
        AND UPPER(rol) = 'REPARTIDOR'`,
    [
      nombreCompleto,
      telefono || null,
      motoMatricula || null,
      passwordRaw ? hashPassword(passwordRaw) : null,
      repartidorId
    ]
  );

  const [updatedRows] = await pool.query(
    `SELECT id, nombre_completo, dni, telefono, email, foto_url, moto_matricula, repartidor_estado, last_lat, last_lng, last_seen_at, is_active
       FROM usuarios
      WHERE id = ?
      LIMIT 1`,
    [repartidorId]
  );

  res.json(mapRepartidorRow(updatedRows[0]));
};

const assignPedidoToRepartidor = async (req, res) => {
  await ensureRepartoSchema();
  const ventaId = Number(req.params.ventaId);
  const repartidorId = Number(req.body?.repartidorId);

  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ message: 'ventaId inválido.' });
  }
  if (!Number.isInteger(repartidorId) || repartidorId <= 0) {
    return res.status(400).json({ message: 'repartidorId inválido.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [ventaRows] = await connection.query(
      `SELECT id, pedido_estado, repartidor_id
         FROM ventas
        WHERE id = ?
        LIMIT 1`,
      [ventaId]
    );
    if (ventaRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    const currentRepartidorId = ventaRows[0].repartidor_id !== null ? Number(ventaRows[0].repartidor_id) : null;
    const pedidoEstado = String(ventaRows[0].pedido_estado || '').trim().toLowerCase();
    if (pedidoEstado === 'entregado' || pedidoEstado === 'rechazado') {
      await connection.rollback();
      return res.status(409).json({ message: 'No se puede asignar repartidor a un pedido cerrado.' });
    }

  const [repRows] = await connection.query(
      `SELECT id, nombre_completo, repartidor_estado, is_active
         FROM usuarios
        WHERE id = ?
          AND UPPER(rol) = 'REPARTIDOR'
        LIMIT 1`,
      [repartidorId]
    );
    if (repRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Repartidor no encontrado.' });
    }
    const rep = repRows[0];
    if (rep.is_active === 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'Repartidor inactivo.' });
    }

    const estado = String(rep.repartidor_estado || 'libre').toLowerCase();
    if (estado !== 'libre' && currentRepartidorId !== repartidorId) {
      await connection.rollback();
      return res.status(409).json({ message: 'Repartidor no disponible (ocupado).' });
    }

    await connection.execute(
      `UPDATE ventas
          SET repartidor_id = ?,
              repartidor_asignado_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [repartidorId, ventaId]
    );

    await connection.execute(
      "UPDATE usuarios SET repartidor_estado = 'ocupado' WHERE id = ? AND UPPER(rol) = 'REPARTIDOR'",
      [repartidorId]
    );

    if (currentRepartidorId && currentRepartidorId !== repartidorId) {
      await connection.execute(
        "UPDATE usuarios SET repartidor_estado = 'libre' WHERE id = ? AND UPPER(rol) = 'REPARTIDOR'",
        [currentRepartidorId]
      );
    }

    await connection.commit();

    const [ventaOut] = await pool.query(
      `SELECT id, repartidor_id, repartidor_asignado_at
         FROM ventas
        WHERE id = ?`,
      [ventaId]
    );
    res.json({
      ventaId,
      repartidorId: ventaOut[0]?.repartidor_id !== null ? Number(ventaOut[0]?.repartidor_id) : null,
      repartidorAsignadoAt: ventaOut[0]?.repartidor_asignado_at
        ? (ventaOut[0]?.repartidor_asignado_at instanceof Date
            ? ventaOut[0]?.repartidor_asignado_at.toISOString()
            : ventaOut[0]?.repartidor_asignado_at)
        : null
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_e) {
      // ignore
    }
    throw error;
  } finally {
    connection.release();
  }
};

const getPedidoTracking = async (req, res) => {
  await ensureRepartoSchema();
  const ventaId = Number(req.params.ventaId);
  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ message: 'ventaId inválido.' });
  }

  const [ventas] = await pool.query(
    `SELECT v.id, v.pedido_estado, v.pedido_updated_at, v.direccion_entrega, v.ubicacion_lat, v.ubicacion_lng,
            v.cliente_id,
            v.repartidor_id, v.repartidor_asignado_at,
            u.nombre_completo AS repartidor_nombre, u.telefono AS repartidor_telefono, u.moto_matricula AS repartidor_moto,
            u.repartidor_estado AS repartidor_estado, u.last_lat AS repartidor_last_lat, u.last_lng AS repartidor_last_lng,
            u.last_seen_at AS repartidor_last_seen_at
       FROM ventas v
       LEFT JOIN usuarios u ON u.id = v.repartidor_id
      WHERE v.id = ?
      LIMIT 1`,
    [ventaId]
  );

  if (ventas.length === 0) {
    return res.status(404).json({ message: 'Pedido no encontrado.' });
  }

  const venta = ventas[0];
  const authType = getAuthType(req);
  const authSub = getAuthSub(req);

  if (authType === 'cliente' && Number(venta.cliente_id || 0) !== authSub) {
    return res.status(403).json({ message: 'No autorizado para ver este pedido.' });
  }
  if (authType === 'repartidor' && Number(venta.repartidor_id || 0) !== authSub) {
    return res.status(403).json({ message: 'No autorizado para ver este pedido.' });
  }

  const [lastRows] = await pool.query(
    `SELECT lat, lng, created_at
       FROM repartidor_ubicaciones
      WHERE venta_id = ?
      ORDER BY id DESC
      LIMIT 1`,
    [ventaId]
  );

  const [historyRows] = await pool.query(
    `SELECT lat, lng, created_at
       FROM repartidor_ubicaciones
      WHERE venta_id = ?
      ORDER BY id DESC
      LIMIT 200`,
    [ventaId]
  );

  const history = historyRows
    .slice()
    .reverse()
    .map((row) => ({
      lat: Number(row.lat),
      lng: Number(row.lng),
      at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    }));

  const last = lastRows.length
    ? {
        lat: Number(lastRows[0].lat),
        lng: Number(lastRows[0].lng),
        at: lastRows[0].created_at instanceof Date ? lastRows[0].created_at.toISOString() : lastRows[0].created_at
      }
    : null;

  res.json({
    venta: {
      id: Number(venta.id),
      pedidoEstado: venta.pedido_estado || null,
      pedidoUpdatedAt: venta.pedido_updated_at
        ? (venta.pedido_updated_at instanceof Date ? venta.pedido_updated_at.toISOString() : venta.pedido_updated_at)
        : null,
      direccionEntrega: venta.direccion_entrega || null,
      ubicacionLat: venta.ubicacion_lat !== null && venta.ubicacion_lat !== undefined ? Number(venta.ubicacion_lat) : null,
      ubicacionLng: venta.ubicacion_lng !== null && venta.ubicacion_lng !== undefined ? Number(venta.ubicacion_lng) : null,
      repartidorId: venta.repartidor_id !== null && venta.repartidor_id !== undefined ? Number(venta.repartidor_id) : null,
      repartidorAsignadoAt: venta.repartidor_asignado_at
        ? (venta.repartidor_asignado_at instanceof Date
            ? venta.repartidor_asignado_at.toISOString()
            : venta.repartidor_asignado_at)
        : null
    },
    repartidor: venta.repartidor_id
      ? {
          id: Number(venta.repartidor_id),
          nombreCompleto: venta.repartidor_nombre || null,
          telefono: venta.repartidor_telefono || null,
          motoMatricula: venta.repartidor_moto || null,
          estado: venta.repartidor_estado || null,
          lastLat:
            venta.repartidor_last_lat !== null && venta.repartidor_last_lat !== undefined
              ? Number(venta.repartidor_last_lat)
              : null,
          lastLng:
            venta.repartidor_last_lng !== null && venta.repartidor_last_lng !== undefined
              ? Number(venta.repartidor_last_lng)
              : null,
          lastSeenAt: venta.repartidor_last_seen_at
            ? (venta.repartidor_last_seen_at instanceof Date
                ? venta.repartidor_last_seen_at.toISOString()
                : venta.repartidor_last_seen_at)
            : null
        }
      : null,
    last,
    history
  });
};

const reportRepartidorUbicacion = async (req, res) => {
  await ensureRepartoSchema();
  const repartidorId = Number(req.params.id);
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  const ventaIdInput = req.body?.ventaId !== undefined && req.body?.ventaId !== null ? Number(req.body?.ventaId) : null;

  if (!Number.isInteger(repartidorId) || repartidorId <= 0) {
    return res.status(400).json({ message: 'repartidorId inválido.' });
  }
  if (getAuthType(req) === 'repartidor' && getAuthSub(req) !== repartidorId) {
    return res.status(403).json({ message: 'No autorizado para reportar esta ubicación.' });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: 'lat/lng inválidos.' });
  }

  let ventaId = Number.isInteger(ventaIdInput) && ventaIdInput > 0 ? ventaIdInput : null;

  if (!ventaId) {
    const [active] = await pool.query(
      `SELECT id
         FROM ventas
        WHERE repartidor_id = ?
          AND pedido_estado IN ('creando','en_camino')
        ORDER BY repartidor_asignado_at DESC, id DESC
        LIMIT 1`,
      [repartidorId]
    );
    ventaId = active.length ? Number(active[0].id) : null;
  }

  if (!ventaId) {
    // Igual registramos "última ubicación" del repartidor aunque no tenga pedido activo.
    await pool.execute(
      'UPDATE usuarios SET last_lat = ?, last_lng = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ? AND UPPER(rol) = \'REPARTIDOR\'',
      [lat, lng, repartidorId]
    );
    return res.json({ ok: true, ventaId: null });
  }

  await pool.execute(
    'INSERT INTO repartidor_ubicaciones (venta_id, repartidor_id, lat, lng) VALUES (?, ?, ?, ?)',
    [ventaId, repartidorId, lat, lng]
  );
  await pool.execute(
    'UPDATE usuarios SET last_lat = ?, last_lng = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ? AND UPPER(rol) = \'REPARTIDOR\'',
    [lat, lng, repartidorId]
  );

  res.json({ ok: true, ventaId });
};

const getPedidoActivoRepartidor = async (req, res) => {
  await ensureRepartoSchema();
  const repartidorId = Number(req.params.id);
  if (!Number.isInteger(repartidorId) || repartidorId <= 0) {
    return res.status(400).json({ message: 'repartidorId inválido.' });
  }
  if (getAuthType(req) === 'repartidor' && getAuthSub(req) !== repartidorId) {
    return res.status(403).json({ message: 'No autorizado para consultar este repartidor.' });
  }

  const [rows] = await pool.query(
    `SELECT id
       FROM ventas
      WHERE repartidor_id = ?
        AND pedido_estado IN ('creando','en_camino')
      ORDER BY repartidor_asignado_at DESC, id DESC
      LIMIT 1`,
    [repartidorId]
  );

  if (rows.length === 0) {
    return res.json({ venta: null });
  }

  const ventaId = Number(rows[0].id);
  const venta = await fetchVentaDetalleForRepartidor(ventaId);
  if (!venta) return res.json({ venta: null });
  res.json({ venta });
};

const getRepartidorDashboard = async (req, res) => {
  await ensureRepartoSchema();
  const repartidorId = Number(req.params.id);
  if (!Number.isInteger(repartidorId) || repartidorId <= 0) {
    return res.status(400).json({ message: 'repartidorId inválido.' });
  }
  if (getAuthType(req) === 'repartidor' && getAuthSub(req) !== repartidorId) {
    return res.status(403).json({ message: 'No autorizado para consultar este repartidor.' });
  }

  const [repRows] = await pool.query(
    `SELECT id, nombre_completo, dni, telefono, email, foto_url, moto_matricula, repartidor_estado, last_lat, last_lng, last_seen_at, is_active
       FROM usuarios
      WHERE id = ?
        AND UPPER(rol) = 'REPARTIDOR'
      LIMIT 1`,
    [repartidorId]
  );

  if (repRows.length === 0) {
    return res.status(404).json({ message: 'Repartidor no encontrado.' });
  }

  const profile = mapRepartidorRow(repRows[0]);

  const [activeRows] = await pool.query(
    `SELECT id
       FROM ventas
      WHERE repartidor_id = ?
        AND pedido_estado IN ('creando','en_camino')
      ORDER BY repartidor_asignado_at DESC, id DESC
      LIMIT 1`,
    [repartidorId]
  );

  const ventaActiva = activeRows.length ? await fetchVentaDetalleForRepartidor(Number(activeRows[0].id)) : null;

  const [[statsRow]] = await pool.query(
    `SELECT
        SUM(CASE WHEN pedido_estado = 'entregado' THEN 1 ELSE 0 END) AS entregados,
        SUM(CASE WHEN pedido_estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazados,
        SUM(CASE WHEN pedido_estado IN ('creando','en_camino') THEN 1 ELSE 0 END) AS activos,
        COALESCE(SUM(CASE WHEN pedido_estado = 'entregado' THEN total ELSE 0 END), 0) AS monto_entregado,
        COALESCE(SUM(CASE WHEN DATE(fecha) = CURDATE() AND pedido_estado = 'entregado' THEN total ELSE 0 END), 0) AS monto_hoy,
        SUM(CASE WHEN DATE(fecha) = CURDATE() AND pedido_estado = 'entregado' THEN 1 ELSE 0 END) AS entregados_hoy
       FROM ventas
      WHERE repartidor_id = ?`,
    [repartidorId]
  );

  const [historyRows] = await pool.query(
    `SELECT v.id, v.total, v.metodo_pago, v.fecha, v.pedido_estado, v.pedido_updated_at,
            v.direccion_entrega, v.cliente_nombre, c.telefono AS cliente_telefono
       FROM ventas v
       LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.repartidor_id = ?
      ORDER BY COALESCE(v.pedido_updated_at, v.fecha) DESC, v.id DESC
      LIMIT 12`,
    [repartidorId]
  );

  res.json({
    repartidor: profile,
    stats: {
      entregados: Number(statsRow?.entregados || 0),
      rechazados: Number(statsRow?.rechazados || 0),
      activos: Number(statsRow?.activos || 0),
      montoEntregado: Number(statsRow?.monto_entregado || 0),
      montoHoy: Number(statsRow?.monto_hoy || 0),
      entregadosHoy: Number(statsRow?.entregados_hoy || 0)
    },
    ventaActiva,
    historial: historyRows.map((row) => ({
      id: Number(row.id),
      total: Number(row.total),
      metodoPago: row.metodo_pago,
      fecha: row.fecha instanceof Date ? row.fecha.toISOString() : row.fecha,
      pedidoEstado: row.pedido_estado || null,
      pedidoUpdatedAt: row.pedido_updated_at
        ? (row.pedido_updated_at instanceof Date ? row.pedido_updated_at.toISOString() : row.pedido_updated_at)
        : null,
      direccionEntrega: row.direccion_entrega || null,
      clienteNombre: row.cliente_nombre || null,
      clienteTelefono: row.cliente_telefono || null
    }))
  });
};

const updateRepartidorEstado = async (req, res) => {
  await ensureRepartoSchema();
  const repartidorId = Number(req.params.id);
  const estado = String(req.body?.estado || '').trim().toLowerCase();

  if (!Number.isInteger(repartidorId) || repartidorId <= 0) {
    return res.status(400).json({ message: 'repartidorId inválido.' });
  }
  if (getAuthType(req) === 'repartidor' && getAuthSub(req) !== repartidorId) {
    return res.status(403).json({ message: 'No autorizado para actualizar este estado.' });
  }
  if (!VALID_ESTADOS_REPARTIDOR.has(estado)) {
    return res.status(400).json({ message: 'Estado inválido.' });
  }

  const [result] = await pool.execute(
    'UPDATE usuarios SET repartidor_estado = ? WHERE id = ? AND UPPER(rol) = \'REPARTIDOR\'',
    [estado, repartidorId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Repartidor no encontrado.' });
  }

  const [rows] = await pool.query(
    `SELECT id, nombre_completo, telefono, moto_matricula, repartidor_estado, last_lat, last_lng, last_seen_at, is_active
       FROM usuarios
      WHERE id = ?
        AND UPPER(rol) = 'REPARTIDOR'
      LIMIT 1`,
    [repartidorId]
  );

  res.json(rows.length ? mapRepartidorRow(rows[0]) : null);
};

module.exports = {
  listRepartidores,
  updateRepartidorProfile,
  assignPedidoToRepartidor,
  getPedidoTracking,
  reportRepartidorUbicacion,
  getPedidoActivoRepartidor,
  getRepartidorDashboard,
  updateRepartidorEstado
};
