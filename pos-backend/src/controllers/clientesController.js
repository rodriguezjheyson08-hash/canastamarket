const pool = require('../db/pool');
const { ensureClientesSchema } = require('../features/clientes/schema');
const { hashPassword, verifyPassword, needsPasswordRehash } = require('../utils/passwords');
const { createToken } = require('../utils/tokens');
const { isStrongPassword, PASSWORD_MESSAGE } = require('../features/passwordReset/security');

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

module.exports = { registerCliente, loginCliente, getClienteActual, updateClienteActual };
