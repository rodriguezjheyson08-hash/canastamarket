/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/configuracionController.js
 * QUE HACE: Lee y guarda configuracion personalizable del sistema.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const pool = require('../db/pool');
const { ensureConfiguracionSistemaSchema } = require('../utils/ensureConfiguracionSistemaSchema');

const ALLOWED_KEYS = ['personalizacion', 'boleta'];
const MAX_JSON_LENGTH = 1024 * 1024 * 4;

// LOGICA: parse Config Value evita que un JSON invalido rompa la pantalla.
const parseConfigValue = (value) => {
  try {
    return JSON.parse(String(value || '{}'));
  } catch {
    return {};
  }
};

// LOGICA: normalize Config Payload acepta solo los dos bloques pedidos por la pantalla.
const normalizeConfigPayload = (body = {}) => {
  const result = {};
  for (const key of ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      result[key] = body[key] && typeof body[key] === 'object' ? body[key] : {};
    }
  }
  return result;
};

// CONTROLADOR BACKEND: get Configuracion Sistema devuelve Personalizacion y Boleta desde MySQL.
const getConfiguracionSistema = async (_req, res) => {
  await ensureConfiguracionSistemaSchema();
  const [rows] = await pool.query(
    'SELECT clave, valor FROM configuracion_sistema WHERE clave IN (?, ?)',
    ALLOWED_KEYS
  );

  const data = {
    personalizacion: null,
    boleta: null
  };
  for (const row of rows) {
    data[row.clave] = parseConfigValue(row.valor);
  }

  res.json(data);
};

// CONTROLADOR BACKEND: save Configuracion Sistema persiste ambos formularios de configuracion.
const saveConfiguracionSistema = async (req, res) => {
  await ensureConfiguracionSistemaSchema();
  const data = normalizeConfigPayload(req.body);
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return res.status(400).json({ message: 'No hay configuracion para guardar.' });
  }

  for (const [clave, value] of entries) {
    const serialized = JSON.stringify(value);
    if (serialized.length > MAX_JSON_LENGTH) {
      return res.status(400).json({ message: `La configuracion ${clave} es demasiado grande.` });
    }
    await pool.execute(
      `INSERT INTO configuracion_sistema (clave, valor)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
      [clave, serialized]
    );
  }

  const [rows] = await pool.query(
    'SELECT clave, valor FROM configuracion_sistema WHERE clave IN (?, ?)',
    ALLOWED_KEYS
  );
  const saved = {
    personalizacion: null,
    boleta: null
  };
  for (const row of rows) {
    saved[row.clave] = parseConfigValue(row.valor);
  }

  res.json(saved);
};

module.exports = {
  getConfiguracionSistema,
  saveConfiguracionSistema
};
