const pool = require('../db/pool');
const { ensureCajasSchema } = require('../features/cajas/schema');
const { ensurePedidosOnlineSchema } = require('../features/pedidosOnline/schema');

const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const getUsuarioNombre = async (usuarioId, runner = pool) => {
  const [rows] = await runner.query(
    'SELECT nombre_completo, nombre_usuario FROM usuarios WHERE id = ? LIMIT 1',
    [usuarioId]
  );
  return rows[0]?.nombre_completo || rows[0]?.nombre_usuario || `Usuario ${usuarioId}`;
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
  const montoEsperado = toMoney(Number(caja.monto_inicial) + efectivoVentas);
  return {
    id: caja.id,
    usuarioId: Number(caja.usuario_id),
    usuarioNombre: caja.usuario_nombre,
    montoInicial: toMoney(caja.monto_inicial),
    montoEsperado,
    montoFinalDeclarado: caja.monto_final_declarado === null ? null : toMoney(caja.monto_final_declarado),
    diferencia: caja.diferencia === null ? null : toMoney(caja.diferencia),
    estado: caja.estado,
    abiertaAt: caja.abierta_at,
    cerradaAt: caja.cerrada_at,
    totalVentas: toMoney(totalVentas),
    pagos
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
  const caja = await findCajaAbierta(Number(req.auth.sub));
  if (!caja) return res.json(null);
  return res.json(await getResumenCaja(caja));
};

const abrirCaja = async (req, res) => {
  await ensureCajasSchema();
  const usuarioId = Number(req.auth.sub);
  const montoInicial = Number(req.body?.montoInicial);
  if (!Number.isFinite(montoInicial) || montoInicial < 0) {
    return res.status(400).json({ message: 'Ingresa un monto inicial válido.' });
  }
  const existente = await findCajaAbierta(usuarioId);
  if (existente) {
    return res.status(409).json({ message: 'Ya tienes una caja abierta.' });
  }
  const usuarioNombre = await getUsuarioNombre(usuarioId);
  const [result] = await pool.execute(
    `INSERT INTO caja_sesiones (usuario_id, usuario_nombre, monto_inicial)
     VALUES (?, ?, ?)`,
    [usuarioId, usuarioNombre, toMoney(montoInicial)]
  );
  const [rows] = await pool.query('SELECT * FROM caja_sesiones WHERE id = ?', [result.insertId]);
  return res.status(201).json(await getResumenCaja(rows[0]));
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
  const [rows] = await pool.query('SELECT * FROM caja_sesiones WHERE id = ?', [caja.id]);
  return res.json(await getResumenCaja(rows[0]));
};

const listCajas = async (req, res) => {
  await ensureCajasSchema();
  const esAdmin = String(req.auth.role || '').toUpperCase() === 'ADMINISTRADOR';
  const params = [];
  const where = esAdmin ? '' : 'WHERE usuario_id = ?';
  if (!esAdmin) params.push(Number(req.auth.sub));
  const [rows] = await pool.query(
    `SELECT * FROM caja_sesiones ${where} ORDER BY abierta_at DESC LIMIT 100`,
    params
  );
  const resultados = [];
  for (const row of rows) resultados.push(await getResumenCaja(row));
  return res.json(resultados);
};

module.exports = { getCajaActual, abrirCaja, cerrarCaja, listCajas, findCajaAbierta };
