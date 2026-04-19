const pool = require('../db/pool');
const { createToken } = require('../utils/tokens');
const { ensurePasswordColumnSchema } = require('../utils/ensurePasswordColumnSchema');
const { hashPassword, verifyPassword, needsPasswordRehash } = require('../utils/passwords');
let googleClient = null;

let clientesTableChecked = false;

const ensureClientesTable = async (runner = pool) => {
  if (clientesTableChecked) return;

  await runner.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(180) NOT NULL UNIQUE,
      password VARCHAR(255) NULL,
      nombre_completo VARCHAR(160) NULL,
      telefono VARCHAR(15) NULL,
      direccion VARCHAR(255) NULL,
      ubicacion_lat DECIMAL(10, 7) NULL,
      ubicacion_lng DECIMAL(10, 7) NULL,
      provider VARCHAR(20) NOT NULL DEFAULT 'email',
      google_sub VARCHAR(80) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_clientes_google_sub (google_sub)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await ensurePasswordColumnSchema({ tableName: 'clientes', nullable: true, runner });

  const [cols] = await runner.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'clientes'
        AND COLUMN_NAME IN ('ubicacion_lat', 'ubicacion_lng')`
  );
  const columnSet = new Set(cols.map((r) => String(r.COLUMN_NAME || '').toLowerCase()));
  if (!columnSet.has('ubicacion_lat')) {
    await runner.query('ALTER TABLE clientes ADD COLUMN ubicacion_lat DECIMAL(10, 7) NULL');
  }
  if (!columnSet.has('ubicacion_lng')) {
    await runner.query('ALTER TABLE clientes ADD COLUMN ubicacion_lng DECIMAL(10, 7) NULL');
  }

  clientesTableChecked = true;
};

const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const mapClienteRow = (row) => ({
  id: row.id,
  email: row.email,
  nombreCompleto: row.nombre_completo,
  telefono: row.telefono,
  direccion: row.direccion,
  ubicacionLat: row.ubicacion_lat !== null && row.ubicacion_lat !== undefined ? Number(row.ubicacion_lat) : null,
  ubicacionLng: row.ubicacion_lng !== null && row.ubicacion_lng !== undefined ? Number(row.ubicacion_lng) : null,
  provider: row.provider,
  isActive: row.is_active === 1,
  createdAt: row.created_at
});

const updateCliente = async (req, res) => {
  await ensureClientesTable();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'ID inválido.' });
  }
  if (String(req.auth?.type || '') === 'cliente' && Number(req.auth?.sub) !== id) {
    return res.status(403).json({ message: 'No autorizado para editar este perfil.' });
  }

  const { nombreCompleto, telefono, direccion, ubicacionLat, ubicacionLng } = req.body || {};

  const nombreValue = typeof nombreCompleto === 'string' ? nombreCompleto.trim() : null;
  const telefonoValue = typeof telefono === 'string' ? telefono.trim() : null;
  const direccionValue = typeof direccion === 'string' ? direccion.trim() : null;

  const lat = ubicacionLat === null || ubicacionLat === undefined || ubicacionLat === ''
    ? null
    : Number(ubicacionLat);
  const lng = ubicacionLng === null || ubicacionLng === undefined || ubicacionLng === ''
    ? null
    : Number(ubicacionLng);

  if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
    return res.status(400).json({ message: 'Latitud inválida.' });
  }
  if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
    return res.status(400).json({ message: 'Longitud inválida.' });
  }

  const [result] = await pool.execute(
    `UPDATE clientes SET
      nombre_completo = COALESCE(?, nombre_completo),
      telefono = COALESCE(?, telefono),
      direccion = COALESCE(?, direccion),
      ubicacion_lat = COALESCE(?, ubicacion_lat),
      ubicacion_lng = COALESCE(?, ubicacion_lng)
     WHERE id = ?`,
    [
      nombreValue === '' ? null : nombreValue,
      telefonoValue === '' ? null : telefonoValue,
      direccionValue === '' ? null : direccionValue,
      lat,
      lng,
      id
    ]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Cliente no encontrado.' });
  }

  const [rows] = await pool.query(
    `SELECT id, email, password, nombre_completo, telefono, direccion, ubicacion_lat, ubicacion_lng,
            provider, is_active, created_at
       FROM clientes WHERE id = ?`,
    [id]
  );
  res.json({ cliente: mapClienteRow(rows[0]) });
};

const loginCliente = async (req, res) => {
  await ensureClientesTable();

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
  }
  if (!isEmailValid(email)) {
    return res.status(400).json({ message: 'Correo inválido.' });
  }

  const emailValue = String(email).trim().toLowerCase();
  const [rows] = await pool.query(
    `SELECT id, email, password, nombre_completo, telefono, direccion, ubicacion_lat, ubicacion_lng,
            provider, is_active, created_at
       FROM clientes WHERE email = ?`,
    [emailValue]
  );

  if (rows.length === 0) {
    return res.status(401).json({ message: 'Credenciales inválidas.' });
  }

  const row = rows[0];
  if (row.is_active === 0) {
    return res.status(403).json({ message: 'Cuenta desactivada.' });
  }

  const provider = String(row.provider || '').toLowerCase();
  if (provider && provider !== 'email') {
    return res.status(409).json({ message: 'Esta cuenta fue creada con Google. Inicia sesión con Google.' });
  }

  const passwordOk = verifyPassword(row.password, password);
  if (!passwordOk) {
    return res.status(401).json({ message: 'Credenciales inválidas.' });
  }

  if (needsPasswordRehash(row.password)) {
    const hashedPassword = hashPassword(password);
    await pool.execute('UPDATE clientes SET password = ? WHERE id = ?', [hashedPassword, row.id]);
  }

  const token = createToken({
    sub: row.id,
    role: 'CLIENTE',
    type: 'cliente'
  });

  res.json({ token, cliente: mapClienteRow(row) });
};

const registerCliente = async (req, res) => {
  await ensureClientesTable();

  const { email, password, nombreCompleto, telefono, direccion } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
  }
  if (!isEmailValid(email)) {
    return res.status(400).json({ message: 'Correo inválido.' });
  }

  const safePassword = String(password);
  if (safePassword.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const emailValue = String(email).trim().toLowerCase();
  const telefonoValue = telefono ? String(telefono).trim() : null;
  const direccionValue = direccion ? String(direccion).trim() : null;
  const nombreCompletoValue = nombreCompleto ? String(nombreCompleto).trim() : null;

  const [existing] = await pool.query('SELECT id FROM clientes WHERE email = ?', [emailValue]);
  if (existing.length > 0) {
    return res.status(409).json({ message: 'Ya existe una cuenta con ese correo.' });
  }

  const [result] = await pool.execute(
    `INSERT INTO clientes (email, password, nombre_completo, telefono, direccion, provider)
     VALUES (?, ?, ?, ?, ?, 'email')`,
    [emailValue, hashPassword(safePassword), nombreCompletoValue, telefonoValue, direccionValue]
  );

  const [rows] = await pool.query(
    `SELECT id, email, nombre_completo, telefono, direccion, ubicacion_lat, ubicacion_lng,
            provider, is_active, created_at
     FROM clientes WHERE id = ?`,
    [result.insertId]
  );

  const created = mapClienteRow(rows[0]);
  const token = createToken({
    sub: created.id,
    role: 'CLIENTE',
    type: 'cliente'
  });

  res.status(201).json({ token, cliente: created });
};

const getGoogleClient = () => {
  if (googleClient) return googleClient;
  let OAuth2Client;
  try {
    ({ OAuth2Client } = require('google-auth-library'));
  } catch (_error) {
    const err = new Error(
      "Falta dependencia 'google-auth-library'. Ejecuta: npm -C pos-backend install (o npm install google-auth-library) y reinicia el backend."
    );
    err.status = 500;
    throw err;
  }
  googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return googleClient;
};

const registerClienteGoogle = async (req, res) => {
  await ensureClientesTable();

  const googleClientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!googleClientId) {
    return res.status(500).json({ message: 'Google no está configurado en el backend (GOOGLE_CLIENT_ID).' });
  }

  const credential = String(req.body?.credential || '').trim();
  if (!credential) {
    return res.status(400).json({ message: 'Credencial de Google requerida.' });
  }

  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: googleClientId
  });

  const payload = ticket.getPayload() || {};
  const email = String(payload.email || '').trim().toLowerCase();
  const sub = String(payload.sub || '').trim();
  const name = String(payload.name || '').trim();

  if (!email || !isEmailValid(email)) {
    return res.status(400).json({ message: 'No se pudo obtener un correo válido desde Google.' });
  }
  if (!sub) {
    return res.status(400).json({ message: 'No se pudo obtener identificador de Google.' });
  }

  const [existingByEmail] = await pool.query(
    `SELECT id, email, nombre_completo, telefono, direccion, ubicacion_lat, ubicacion_lng,
            provider, google_sub, is_active, created_at
     FROM clientes WHERE email = ?`,
    [email]
  );

  if (existingByEmail.length > 0) {
    const existing = existingByEmail[0];
    const provider = String(existing.provider || '').toLowerCase();
    if (provider !== 'google') {
      return res.status(409).json({ message: 'Ese correo ya está registrado con contraseña.' });
    }
    if (existing.google_sub && String(existing.google_sub) !== sub) {
      return res.status(409).json({ message: 'Conflicto de cuenta Google. Contacta soporte.' });
    }
    const token = createToken({
      sub: existing.id,
      role: 'CLIENTE',
      type: 'cliente'
    });
    return res.json({ token, cliente: mapClienteRow(existing) });
  }

  const [result] = await pool.execute(
    `INSERT INTO clientes (email, password, nombre_completo, provider, google_sub)
     VALUES (?, NULL, ?, 'google', ?)`,
    [email, name || null, sub]
  );

  const [rows] = await pool.query(
    `SELECT id, email, nombre_completo, telefono, direccion, ubicacion_lat, ubicacion_lng,
            provider, is_active, created_at
     FROM clientes WHERE id = ?`,
    [result.insertId]
  );

  const created = mapClienteRow(rows[0]);
  const token = createToken({
    sub: created.id,
    role: 'CLIENTE',
    type: 'cliente'
  });

  res.status(201).json({ token, cliente: created });
};

module.exports = {
  registerCliente,
  registerClienteGoogle,
  loginCliente,
  updateCliente
};
