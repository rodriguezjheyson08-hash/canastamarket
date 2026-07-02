/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/authController.js
 * QUE HACE: Recibe req/res, ejecuta logica de negocio y responde al frontend.
 */
const pool = require('../db/pool');
const { normalizePermisos } = require('../utils/permisos');
const { ensurePasswordColumnSchema } = require('../utils/ensurePasswordColumnSchema');
const { hashPassword, verifyPassword, needsPasswordRehash } = require('../utils/passwords');
const { createToken } = require('../utils/tokens');
const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');

let usuariosPermisosColumnChecked = false;

const USER_SELECT = `SELECT id, nombre_usuario, nombre_completo, rol, password, dni, telefono, email, foto_url,
            permisos, failed_attempts, lockouts, lock_until, is_blocked, is_active
     FROM usuarios`;

const ensureUsuariosPermisosColumn = async (runner = pool) => {
  if (usuariosPermisosColumnChecked) return;

  await ensurePasswordColumnSchema({ tableName: 'usuarios', runner });

  const [rows] = await runner.query(
    `SELECT COLUMN_NAME, DATA_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'usuarios'
        AND COLUMN_NAME IN ('permisos', 'dni', 'email')`
  );

  const info = rows.reduce((acc, row) => {
    acc[String(row.COLUMN_NAME || '').toLowerCase()] = String(row.DATA_TYPE || '').toLowerCase();
    return acc;
  }, {});

  if (!info.permisos) {
    await runner.query('ALTER TABLE usuarios ADD COLUMN permisos LONGTEXT NULL');
  } else {
    const validTypes = new Set(['json', 'text', 'mediumtext', 'longtext']);
    if (!validTypes.has(info.permisos)) {
      await runner.query('ALTER TABLE usuarios MODIFY COLUMN permisos LONGTEXT NULL');
    }
  }

  if (!info.dni) {
    await runner.query('ALTER TABLE usuarios ADD COLUMN dni VARCHAR(8) NULL');
  } else if (info.dni !== 'varchar') {
    await runner.query('ALTER TABLE usuarios MODIFY COLUMN dni VARCHAR(8) NULL');
  }

  if (!info.email) {
    await runner.query('ALTER TABLE usuarios ADD COLUMN email VARCHAR(180) NULL');
  } else if (info.email !== 'varchar') {
    await runner.query('ALTER TABLE usuarios MODIFY COLUMN email VARCHAR(180) NULL');
  }

  usuariosPermisosColumnChecked = true;
};

const buildAuthPayload = (row) => {
  const user = {
    id: row.id,
    nombreUsuario: row.nombre_usuario,
    nombreCompleto: row.nombre_completo,
    rol: row.rol,
    dni: row.dni,
    telefono: row.telefono,
    email: row.email,
    fotoUrl: row.foto_url,
    permisos: normalizePermisos(row.rol, row.permisos)
  };

  const token = createToken({
    sub: row.id,
    role: row.rol,
    type: 'admin'
  });

  return { token, user };
};

const validateUserAccess = (row) => {
  const role = String(row.rol || '').trim().toUpperCase();
  if (!['ADMINISTRADOR', 'CAJERO'].includes(role)) {
    return { status: 403, message: 'Rol no permitido en este sistema.' };
  }

  if (row.is_active === 0) {
    return { status: 403, message: 'Cuenta desactivada. Contacta al administrador.' };
  }

  if (row.is_blocked) {
    return { status: 403, message: 'Cuenta bloqueada. Contacta al administrador.' };
  }

  return null;
};

const resetLoginAttempts = async (userId) => {
  await pool.execute(
    'UPDATE usuarios SET failed_attempts = 0, lockouts = 0, lock_until = NULL WHERE id = ?',
    [userId]
  );
};


const login = async (req, res) => {
  await ensureUsuariosPermisosColumn();
  const { nombreUsuario, password } = req.body;
  const identifier = String(nombreUsuario || '').trim();
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Rellena todos los campos.' });
  }

  const [rows] = await pool.query(
    `${USER_SELECT} WHERE nombre_usuario = ? LIMIT 1`,
    [identifier]
  );

  if (rows.length === 0) {
    return res.status(401).json({ message: 'Credenciales inválidas.' });
  }

  const row = rows[0];
  const accessError = validateUserAccess(row);
  if (accessError) {
    return res.status(accessError.status).json({ message: accessError.message });
  }

  const passwordOk = verifyPassword(row.password, password);
  if (!passwordOk) {
    return res.status(401).json({ message: 'Credenciales inválidas.' });
  }

  await resetLoginAttempts(row.id);

  if (needsPasswordRehash(row.password)) {
    const hashedPassword = hashPassword(password);
    await pool.execute('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, row.id]);
  }

  res.json(buildAuthPayload(row));
};

const getCurrentUser = async (req, res) => {
  await ensureUsuariosPermisosColumn();
  const userId = req.auth?.sub;
  const [rows] = await pool.query(`${USER_SELECT} WHERE id = ? LIMIT 1`, [userId]);

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }

  const row = rows[0];
  const accessError = validateUserAccess(row);
  if (accessError) {
    return res.status(accessError.status).json({ message: accessError.message });
  }

  res.json({ user: buildAuthPayload(row).user });
};

const googleLogin = async (req, res) => {
  await ensureUsuariosPermisosColumn();
  const credential = String(req.body?.credential || '').trim();
  const clientId = String(env.google?.clientId || '').trim();
  if (!clientId) return res.status(503).json({ message: 'El acceso con Google no está configurado.' });
  if (!credential) return res.status(400).json({ message: 'Credencial de Google obligatoria.' });

  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    const email = String(payload?.email || '').trim().toLowerCase();
    if (!payload?.email_verified || !email) {
      return res.status(401).json({ message: 'Google no confirmó el correo.' });
    }
    const [rows] = await pool.query(`${USER_SELECT} WHERE LOWER(email) = ? LIMIT 1`, [email]);
    if (rows.length === 0) {
      return res.status(403).json({ message: 'Este correo de Google no está registrado como personal.' });
    }
    const accessError = validateUserAccess(rows[0]);
    if (accessError) return res.status(accessError.status).json({ message: accessError.message });
    return res.json(buildAuthPayload(rows[0]));
  } catch {
    return res.status(401).json({ message: 'No se pudo validar el acceso con Google.' });
  }
};

module.exports = {
  getCurrentUser,
  login,
  googleLogin
};
