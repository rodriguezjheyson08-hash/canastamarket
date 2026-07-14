const pool = require('../db/pool');
const { ensureCajasSchema } = require('../features/cajas/schema');
const { ensurePedidosOnlineSchema } = require('../features/pedidosOnline/schema');
const { registrarAuditoria } = require('../features/auditoria/service');

const MAX_FONDO_CAJA = 2000;
const toMoney = (value) => Number(Number(value || 0).toFixed(2));
const isAdmin = (req) => String(req.auth?.role || '').toUpperCase() === 'ADMINISTRADOR';

const getUsuarioNombre = async (usuarioId, runner = pool) => {
  const [rows] = await runner.query(
    'SELECT nombre_completo, nombre_usuario FROM usuarios WHERE id = ? LIMIT 1',
    [usuarioId]
  );
  return rows[0]?.nombre_completo || rows[0]?.nombre_usuario || `Usuario ${usuarioId}`;
};

const mapFondoCaja = (row) => ({
  id: Number(row.id),
  usuarioId: Number(row.usuario_id),
  usuarioNombre: row.usuario_nombre,
  asignadoPorId: Number(row.asignado_por_id),
  asignadoPorNombre: row.asignado_por_nombre,
  monto: toMoney(row.monto),
  estado: row.estado,
  cajaSesionId: row.caja_sesion_id === null || row.caja_sesion_id === undefined ? null : Number(row.caja_sesion_id),
  nota: row.nota,
  creadoAt: row.creado_at,
  usadoAt: row.usado_at
});

const mapMovimientoEfectivo = (row) => ({
  id: Number(row.id),
  cajaSesionId: Number(row.caja_sesion_id),
  usuarioId: Number(row.usuario_id),
  usuarioNombre: row.usuario_nombre,
  tipo: row.tipo,
  monto: toMoney(row.monto),
  motivo: row.motivo,
  creadoAt: row.creado_at
});

const getFondoPendiente = async (usuarioId, runner = pool, lock = false) => {
  const [rows] = await runner.query(
    `SELECT *
       FROM caja_fondos_asignados
      WHERE usuario_id = ?
        AND estado = 'PENDIENTE'
      ORDER BY creado_at ASC, id ASC
      LIMIT 1 ${lock ? 'FOR UPDATE' : ''}`,
    [usuarioId]
  );
  return rows[0] || null;
};

const getResumenCaja = async (caja, runner = pool) => {
  await ensurePedidosOnlineSchema(runner);
  const [rows] = await runner.query(
    `SELECT vp.metodo,
            COUNT(DISTINCT vp.venta_id) AS cantidad_ventas,
            COALESCE(SUM(vp.monto), 0) AS total
       FROM venta_pagos vp
       JOIN ventas v ON v.id = vp.venta_id
      WHERE v.caja_sesion_id = ?
      GROUP BY vp.metodo`,
    [caja.id]
  );
  const pagos = rows.map((row) => ({
    metodo: row.metodo,
    cantidadVentas: Number(row.cantidad_ventas),
    total: toMoney(row.total)
  }));
  const [pedidosOnlineRows] = await runner.query(
    `SELECT id, pago_recogida_metodo, total, pago_recogida_detalle
       FROM pedidos_online
      WHERE caja_sesion_id = ?
        AND estado = 'RECOGIDO'
        AND pago_recogida_metodo IS NOT NULL`,
    [caja.id]
  );
  const addPago = (metodo, monto) => {
    const total = toMoney(monto);
    if (total <= 0) return;
    const existente = pagos.find((pago) => pago.metodo === metodo);
    if (existente) {
      existente.cantidadVentas += 1;
      existente.total = toMoney(existente.total + total);
    } else {
      pagos.push({ metodo, cantidadVentas: 1, total });
    }
  };
  pedidosOnlineRows.forEach((pedido) => {
    if (pedido.pago_recogida_metodo === 'mixto_efectivo_yape') {
      const detalle = typeof pedido.pago_recogida_detalle === 'string'
        ? JSON.parse(pedido.pago_recogida_detalle || '{}')
        : (pedido.pago_recogida_detalle || {});
      addPago('efectivo', detalle.efectivo || 0);
      addPago('yape', detalle.yape || 0);
      return;
    }
    addPago(pedido.pago_recogida_metodo, pedido.total);
  });
  const efectivoVentas = pagos
    .filter((pago) => pago.metodo === 'efectivo')
    .reduce((sum, pago) => sum + pago.total, 0);
  const totalVentas = pagos.reduce((sum, pago) => sum + pago.total, 0);
  const [movimientoRows] = await runner.query(
    `SELECT *
       FROM caja_movimientos_efectivo
      WHERE caja_sesion_id = ?
      ORDER BY creado_at ASC, id ASC`,
    [caja.id]
  );
  const movimientosEfectivo = movimientoRows.map(mapMovimientoEfectivo);
  const entradasEfectivo = movimientosEfectivo
    .filter((movimiento) => movimiento.tipo === 'ENTRADA')
    .reduce((sum, movimiento) => sum + movimiento.monto, 0);
  const salidasEfectivo = movimientosEfectivo
    .filter((movimiento) => movimiento.tipo === 'SALIDA')
    .reduce((sum, movimiento) => sum + movimiento.monto, 0);
  const montoEsperado = toMoney(Number(caja.monto_inicial) + efectivoVentas + entradasEfectivo - salidasEfectivo);
  return {
    id: caja.id,
    usuarioId: Number(caja.usuario_id),
    usuarioNombre: caja.usuario_nombre,
    montoInicial: toMoney(caja.monto_inicial),
    fondoAsignadoId: caja.fondo_asignado_id === null || caja.fondo_asignado_id === undefined
      ? null
      : Number(caja.fondo_asignado_id),
    efectivoVentas: toMoney(efectivoVentas),
    entradasEfectivo: toMoney(entradasEfectivo),
    salidasEfectivo: toMoney(salidasEfectivo),
    efectivoAEntregar: montoEsperado,
    montoEsperado,
    montoFinalDeclarado: caja.monto_final_declarado === null ? null : toMoney(caja.monto_final_declarado),
    diferencia: caja.diferencia === null ? null : toMoney(caja.diferencia),
    estado: caja.estado,
    abiertaAt: caja.abierta_at,
    cerradaAt: caja.cerrada_at,
    totalVentas: toMoney(totalVentas),
    pagos,
    movimientosEfectivo
  };
};

const findCajaAbierta = async (usuarioId, runner = pool) => {
  const [rows] = await runner.query(
    "SELECT * FROM caja_sesiones WHERE usuario_id = ? AND estado = 'ABIERTA' ORDER BY id DESC LIMIT 1",
    [usuarioId]
  );
  return rows[0] || null;
};

const getCajaActual = async (req, res) => {
  await ensureCajasSchema();
  const usuarioId = Number(req.auth.sub);
  const caja = await findCajaAbierta(usuarioId);
  const fondoPendiente = await getFondoPendiente(usuarioId);
  return res.json({
    caja: caja ? await getResumenCaja(caja) : null,
    fondoPendiente: fondoPendiente ? mapFondoCaja(fondoPendiente) : null
  });
};

const abrirCaja = async (req, res) => {
  await ensureCajasSchema();
  const usuarioId = Number(req.auth.sub);
  const rolAdmin = isAdmin(req);
  const montoSolicitado = Number(req.body?.montoInicial);

  if (rolAdmin && (!Number.isFinite(montoSolicitado) || montoSolicitado < 0 || montoSolicitado > MAX_FONDO_CAJA)) {
    return res.status(400).json({ message: `El fondo inicial debe estar entre S/ 0.00 y S/ ${MAX_FONDO_CAJA}.` });
  }

  const existente = await findCajaAbierta(usuarioId);
  if (existente) {
    return res.status(409).json({ message: 'Ya tienes una caja abierta.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const usuarioNombre = await getUsuarioNombre(usuarioId, connection);
    let fondo = null;
    let montoInicial = toMoney(montoSolicitado);

    if (!rolAdmin) {
      fondo = await getFondoPendiente(usuarioId, connection, true);
      if (!fondo) {
        await connection.rollback();
        return res.status(409).json({
          message: 'No tienes fondo asignado por el administrador. Pide al administrador que registre el efectivo inicial de tu caja.'
        });
      }
      montoInicial = toMoney(fondo.monto);
    }

    const [result] = await connection.execute(
      `INSERT INTO caja_sesiones (usuario_id, usuario_nombre, monto_inicial, fondo_asignado_id)
       VALUES (?, ?, ?, ?)`,
      [usuarioId, usuarioNombre, montoInicial, fondo ? fondo.id : null]
    );

    if (fondo) {
      await connection.execute(
        `UPDATE caja_fondos_asignados
            SET estado = 'USADO', caja_sesion_id = ?, usado_at = CURRENT_TIMESTAMP
          WHERE id = ? AND estado = 'PENDIENTE'`,
        [result.insertId, fondo.id]
      );
    }

    await registrarAuditoria(connection, {
      req,
      accion: 'CAJA_ABIERTA',
      entidad: 'caja_sesion',
      entidadId: result.insertId,
      detalle: { montoInicial, usuarioId, fondoAsignadoId: fondo ? fondo.id : null }
    });
    await connection.commit();

    const [rows] = await pool.query('SELECT * FROM caja_sesiones WHERE id = ?', [result.insertId]);
    return res.status(201).json(await getResumenCaja(rows[0]));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const cerrarCaja = async (req, res) => {
  await ensureCajasSchema();
  const usuarioId = Number(req.auth.sub);
  const montoFinal = Number(req.body?.montoFinalDeclarado);
  if (!Number.isFinite(montoFinal) || montoFinal < 0) {
    return res.status(400).json({ message: 'Ingresa el efectivo contado al cerrar.' });
  }
  const caja = await findCajaAbierta(usuarioId);
  if (!caja) return res.status(409).json({ message: 'No tienes una caja abierta.' });
  const resumen = await getResumenCaja(caja);
  const diferencia = toMoney(montoFinal - resumen.montoEsperado);
  await pool.execute(
    `UPDATE caja_sesiones
        SET monto_esperado = ?, monto_final_declarado = ?, diferencia = ?,
            estado = 'CERRADA', cerrada_at = CURRENT_TIMESTAMP
      WHERE id = ? AND estado = 'ABIERTA'`,
    [resumen.montoEsperado, toMoney(montoFinal), diferencia, caja.id]
  );
  await registrarAuditoria(pool, {
    req,
    accion: 'CAJA_CERRADA',
    entidad: 'caja_sesion',
    entidadId: caja.id,
    detalle: {
      fondoAsignadoId: resumen.fondoAsignadoId,
      montoInicial: resumen.montoInicial,
      efectivoVentas: resumen.efectivoVentas,
      entradasEfectivo: resumen.entradasEfectivo,
      salidasEfectivo: resumen.salidasEfectivo,
      montoEsperado: resumen.montoEsperado,
      montoFinalDeclarado: toMoney(montoFinal),
      diferencia
    }
  });
  const [rows] = await pool.query('SELECT * FROM caja_sesiones WHERE id = ?', [caja.id]);
  return res.json(await getResumenCaja(rows[0]));
};

const listCajas = async (req, res) => {
  await ensureCajasSchema();
  const params = [];
  const where = isAdmin(req) ? '' : 'WHERE usuario_id = ?';
  if (!isAdmin(req)) params.push(Number(req.auth.sub));
  const [rows] = await pool.query(
    `SELECT * FROM caja_sesiones ${where} ORDER BY abierta_at DESC LIMIT 100`,
    params
  );
  const resultados = [];
  for (const row of rows) resultados.push(await getResumenCaja(row));
  return res.json(resultados);
};

const registrarMovimientoEfectivo = async (req, res) => {
  await ensureCajasSchema();
  const usuarioId = Number(req.auth.sub);
  const tipo = String(req.body?.tipo || '').trim().toUpperCase();
  const monto = Number(req.body?.monto);
  const motivo = String(req.body?.motivo || '').trim();

  if (!['ENTRADA', 'SALIDA'].includes(tipo)) {
    return res.status(400).json({ message: 'Selecciona si el movimiento es entrada o salida.' });
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    return res.status(400).json({ message: 'Ingresa un monto mayor a cero.' });
  }
  if (!motivo) {
    return res.status(400).json({ message: 'El motivo es obligatorio para auditar el dinero.' });
  }

  const caja = await findCajaAbierta(usuarioId);
  if (!caja) return res.status(409).json({ message: 'Debes abrir caja antes de registrar movimientos de efectivo.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const usuarioNombre = await getUsuarioNombre(usuarioId, connection);
    const [result] = await connection.execute(
      `INSERT INTO caja_movimientos_efectivo
        (caja_sesion_id, usuario_id, usuario_nombre, tipo, monto, motivo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [caja.id, usuarioId, usuarioNombre, tipo, toMoney(monto), motivo]
    );

    await registrarAuditoria(connection, {
      req,
      accion: tipo === 'ENTRADA' ? 'CAJA_ENTRADA_EFECTIVO' : 'CAJA_SALIDA_EFECTIVO',
      entidad: 'caja_movimiento_efectivo',
      entidadId: result.insertId,
      detalle: { cajaSesionId: caja.id, tipo, monto: toMoney(monto), motivo }
    });
    await connection.commit();

    const [rows] = await pool.query('SELECT * FROM caja_movimientos_efectivo WHERE id = ?', [result.insertId]);
    return res.status(201).json(mapMovimientoEfectivo(rows[0]));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const asignarFondoCaja = async (req, res) => {
  await ensureCajasSchema();
  if (!isAdmin(req)) return res.status(403).json({ message: 'Solo el administrador puede asignar fondos de caja.' });

  const usuarioId = Number(req.body?.usuarioId);
  const monto = Number(req.body?.monto);
  const nota = String(req.body?.nota || '').trim() || null;

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return res.status(400).json({ message: 'Selecciona un cajero valido.' });
  }
  if (!Number.isFinite(monto) || monto <= 0 || monto > MAX_FONDO_CAJA) {
    return res.status(400).json({ message: `El fondo debe ser mayor a 0 y no superar S/ ${MAX_FONDO_CAJA}.` });
  }

  const [usuarios] = await pool.query(
    "SELECT id, nombre_usuario, nombre_completo, rol FROM usuarios WHERE id = ? AND UPPER(rol) = 'CAJERO' LIMIT 1",
    [usuarioId]
  );
  if (usuarios.length === 0) {
    return res.status(404).json({ message: 'Cajero no encontrado.' });
  }

  const fondoPendiente = await getFondoPendiente(usuarioId);
  if (fondoPendiente) {
    return res.status(409).json({ message: 'Ese cajero ya tiene un fondo pendiente por usar.' });
  }

  const usuarioNombre = usuarios[0].nombre_completo || usuarios[0].nombre_usuario;
  const asignadoPorNombre = await getUsuarioNombre(Number(req.auth.sub));
  const [result] = await pool.execute(
    `INSERT INTO caja_fondos_asignados
      (usuario_id, usuario_nombre, asignado_por_id, asignado_por_nombre, monto, nota)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [usuarioId, usuarioNombre, Number(req.auth.sub), asignadoPorNombre, toMoney(monto), nota]
  );
  await registrarAuditoria(pool, {
    req,
    accion: 'FONDO_CAJA_ASIGNADO',
    entidad: 'caja_fondo',
    entidadId: result.insertId,
    detalle: { usuarioId, usuarioNombre, monto: toMoney(monto), nota }
  });

  const [rows] = await pool.query('SELECT * FROM caja_fondos_asignados WHERE id = ?', [result.insertId]);
  return res.status(201).json(mapFondoCaja(rows[0]));
};

const listFondosCaja = async (req, res) => {
  await ensureCajasSchema();
  const params = [];
  const where = isAdmin(req) ? '' : 'WHERE usuario_id = ?';
  if (!isAdmin(req)) params.push(Number(req.auth.sub));
  const [rows] = await pool.query(
    `SELECT * FROM caja_fondos_asignados ${where} ORDER BY creado_at DESC LIMIT 100`,
    params
  );
  return res.json(rows.map(mapFondoCaja));
};

module.exports = {
  getCajaActual,
  abrirCaja,
  cerrarCaja,
  listCajas,
  registrarMovimientoEfectivo,
  asignarFondoCaja,
  listFondosCaja,
  findCajaAbierta
};
