const pool = require('../db/pool');
const { ensureClientesSchema } = require('../features/clientes/schema');
const { hashPassword, verifyPassword, needsPasswordRehash } = require('../utils/passwords');
const { createToken } = require('../utils/tokens');
const { isStrongPassword, PASSWORD_MESSAGE } = require('../features/passwordReset/security');
const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');

const emailValido = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const mapCliente = (row) => ({
  id: Number(row.id), nombre: row.nombre_completo || '', dni: row.dni || '', email: row.email,
  telefono: row.telefono || '', direccion: row.direccion || ''
});

const registerCliente = async (req, res) => {
  await ensureClientesSchema();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const nombre = String(req.body?.nombre || '').trim();
  const dni = String(req.body?.dni || '').replace(/\D/g, '');
  const telefono = String(req.body?.telefono || '').trim();
  const direccion = String(req.body?.direccion || '').trim();
  const password = String(req.body?.password || '');
  if (!emailValido(email) || !nombre || !/^\d{8}$/.test(dni) || !telefono) {
    return res.status(400).json({ message: 'Nombre, DNI, correo y teléfono válidos son obligatorios.' });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ message: PASSWORD_MESSAGE });
  }
  try {
    const [result] = await pool.execute(
      `INSERT INTO clientes (email, password, nombre_completo, dni, telefono, direccion, provider, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 'email', 1)`,
      [email, hashPassword(password), nombre, dni, telefono, direccion || null]
    );
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
    const cliente = mapCliente(rows[0]);
    return res.status(201).json({ token: createToken({ sub: cliente.id, role: 'CLIENTE', type: 'cliente' }), cliente });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe una cuenta con ese correo.' });
    throw error;
  }
};

const loginCliente = async (req, res) => {
  await ensureClientesSchema();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const [rows] = await pool.query('SELECT * FROM clientes WHERE email = ? LIMIT 1', [email]);
  const row = rows[0];
  if (!row || !row.is_active || !verifyPassword(row.password, password)) {
    return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
  }
  if (needsPasswordRehash(row.password)) {
    await pool.execute('UPDATE clientes SET password = ? WHERE id = ?', [hashPassword(password), row.id]);
  }
  const cliente = mapCliente(row);
  return res.json({ token: createToken({ sub: cliente.id, role: 'CLIENTE', type: 'cliente' }), cliente });
};

const googleLoginCliente = async (req, res) => {
  await ensureClientesSchema();
  const credential = String(req.body?.credential || '').trim();
  const clientId = String(env.google?.clientId || '').trim();
  if (!clientId) return res.status(503).json({ message: 'El acceso con Google no esta configurado.' });
  if (!credential) return res.status(400).json({ message: 'Credencial de Google obligatoria.' });

  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
    const profile = ticket.getPayload();
    const email = String(profile?.email || '').trim().toLowerCase();
    const googleSub = String(profile?.sub || '').trim();
    const nombre = String(profile?.name || '').trim() || 'Cliente Google';
    if (!profile?.email_verified || !email || !googleSub) {
      return res.status(401).json({ message: 'Google no confirmo el correo.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM clientes WHERE google_sub = ? OR email = ? ORDER BY google_sub = ? DESC LIMIT 1',
      [googleSub, email, googleSub]
    );
    let row = rows[0];
    if (row && row.google_sub && row.google_sub !== googleSub) {
      return res.status(409).json({ message: 'El correo ya esta vinculado a otra cuenta de Google.' });
    }
    if (row && !row.is_active) {
      return res.status(403).json({ message: 'La cuenta del cliente esta deshabilitada.' });
    }

    if (row) {
      await pool.execute(
        `UPDATE clientes
          SET google_sub = ?, provider = 'google',
              nombre_completo = COALESCE(NULLIF(nombre_completo, ''), ?)
          WHERE id = ?`,
        [googleSub, nombre, row.id]
      );
      [row] = (await pool.query('SELECT * FROM clientes WHERE id = ?', [row.id]))[0];
    } else {
      const [result] = await pool.execute(
        `INSERT INTO clientes (email, password, nombre_completo, provider, google_sub, is_active)
          VALUES (?, NULL, ?, 'google', ?, 1)`,
        [email, nombre, googleSub]
      );
      [row] = (await pool.query('SELECT * FROM clientes WHERE id = ?', [result.insertId]))[0];
    }

    const cliente = mapCliente(row);
    return res.json({ token: createToken({ sub: cliente.id, role: 'CLIENTE', type: 'cliente' }), cliente });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe una cuenta con ese correo.' });
    return res.status(401).json({ message: 'No se pudo validar el acceso con Google.' });
  }
};

const getClienteActual = async (req, res) => {
  await ensureClientesSchema();
  const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ? AND is_active = 1 LIMIT 1', [req.auth.sub]);
  if (!rows[0]) return res.status(404).json({ message: 'Cliente no encontrado.' });
  return res.json(mapCliente(rows[0]));
};

const updateClienteActual = async (req, res) => {
  await ensureClientesSchema();
  const nombre = String(req.body?.nombre || '').trim();
  const dni = String(req.body?.dni || '').replace(/\D/g, '');
  const telefono = String(req.body?.telefono || '').trim();
  const direccion = String(req.body?.direccion || '').trim();
  if (!nombre || !/^\d{8}$/.test(dni) || !telefono) {
    return res.status(400).json({ message: 'Nombre, DNI y teléfono válidos son obligatorios.' });
  }
  await pool.execute(
    'UPDATE clientes SET nombre_completo = ?, dni = ?, telefono = ?, direccion = ? WHERE id = ?',
    [nombre, dni, telefono, direccion || null, req.auth.sub]
  );
  return getClienteActual(req, res);
};

module.exports = { registerCliente, loginCliente, googleLoginCliente, getClienteActual, updateClienteActual };
