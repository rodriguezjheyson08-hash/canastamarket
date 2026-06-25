/*
 * MAPA DEL ARCHIVO: CONTROLADOR BACKEND
 * UBICACION: pos-backend/src/controllers/authController.js
 * QUE HACE: Recibe req/res, ejecuta logica de negocio y responde al frontend.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const axios = require('axios');
const pool = require('../db/pool');
const env = require('../config/env');
// DEPENDENCIAS BACKEND: librerias, helpers y tipos que usa este archivo.
const { normalizePermisos } = require('../utils/permisos');
const { ensurePasswordColumnSchema } = require('../utils/ensurePasswordColumnSchema');
const { hashPassword, verifyPassword, needsPasswordRehash } = require('../utils/passwords');
const { createToken } = require('../utils/tokens');

// LOGICA BACKEND - ESTADO INTERNO:
// Evita revisar/agregar columnas de usuarios en cada request; se marca true despues de la primera revision.
let usuariosPermisosColumnChecked = false;
// LOGICA BACKEND - SEGURIDAD:
// Cantidad maxima de intentos de login antes de bloquear la cuenta.
const MAX_LOGIN_ATTEMPTS = 3;
// SERVICIO EXTERNO:
// URL oficial de Google usada para validar el token enviado por el boton "Continuar con Google".
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

// LOGICA BACKEND - CONSULTA BASE:
// Campos que siempre se leen cuando se busca un usuario para login normal o login con Google.
const USER_SELECT = `SELECT id, nombre_usuario, nombre_completo, rol, password, dni, telefono, email, foto_url,
            permisos, failed_attempts, lockouts, lock_until, is_blocked, is_active
     FROM usuarios`;

// LOGICA BACKEND - MIGRACION AUTOMATICA:
// Asegura que la tabla usuarios tenga columnas necesarias para permisos, DNI, email y password.
// Si falta una columna, la agrega; si tiene tipo incorrecto, lo corrige.
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

// LOGICA BACKEND - RESPUESTA DE LOGIN:
// Construye el objeto que recibe React al iniciar sesion: token JWT + datos visibles del usuario.
const buildAuthPayload = (row, extra = {}) => {
  const user = {
    id: row.id,
    nombreUsuario: row.nombre_usuario,
    nombreCompleto: row.nombre_completo,
    rol: row.rol,
    dni: row.dni,
    telefono: row.telefono,
    email: row.email,
    fotoUrl: row.foto_url || extra.fotoUrl,
    permisos: normalizePermisos(row.rol, row.permisos)
  };

  const token = createToken({
    sub: row.id,
    role: row.rol,
    type: 'admin'
  });

  return { token, user };
};

// LOGICA BACKEND - CONTROL DE ACCESO:
// Valida si el usuario puede entrar al sistema antes de revisar o entregar token.
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

// LOGICA BACKEND - INTENTOS DE LOGIN:
// Limpia contador de intentos fallidos cuando el login fue correcto.
const resetLoginAttempts = async (userId) => {
  await pool.execute(
    'UPDATE usuarios SET failed_attempts = 0, lockouts = 0, lock_until = NULL WHERE id = ?',
    [userId]
  );
};

// LOGICA BACKEND - BLOQUEO POR PASSWORD INCORRECTO:
// Suma intentos fallidos; al llegar al maximo bloquea la cuenta y responde error.
const registerFailedAttempt = async (row, res) => {
  const nextAttempts = Number(row.failed_attempts || 0) + 1;

  if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
    await pool.execute(
      'UPDATE usuarios SET is_blocked = 1, failed_attempts = 0, lock_until = NULL WHERE id = ?',
      [row.id]
    );
    return res.status(403).json({
      message: 'Cuenta bloqueada. Te quedan 0 intentos. Contacta al administrador.',
      remaining_attempts: 0
    });
  }

  const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - nextAttempts);
  await pool.execute(
    'UPDATE usuarios SET failed_attempts = ? WHERE id = ?',
    [nextAttempts, row.id]
  );

  return res.status(401).json({
    message: `Credenciales inválidas. Te quedan ${remainingAttempts} intentos.`,
    remaining_attempts: remainingAttempts
  });
};

// SERVICIO BACKEND - GOOGLE LOGIN:
// Valida con Google que el credential recibido sea real, pertenezca a este cliente y tenga email verificado.
const verifyGoogleCredential = async (credential) => {
  const clientId = String(env.google?.clientId || '').trim();
  if (!clientId) {
    throw new Error('Google no está configurado.');
  }

  const { data } = await axios.get(GOOGLE_TOKENINFO_URL, {
    params: { id_token: credential },
    timeout: 8000
  });

  const audience = String(data?.aud || '').trim();
  const email = String(data?.email || '').trim().toLowerCase();
  const emailVerified = String(data?.email_verified || '').toLowerCase() === 'true';

  if (audience !== clientId || !email || !emailVerified) {
    throw new Error('Token de Google inválido.');
  }

  return {
    email,
    name: String(data?.name || '').trim(),
    picture: String(data?.picture || '').trim()
  };
};

// CONTROLADOR BACKEND - LOGIN NORMAL:
// Endpoint usado por el formulario de usuario/password. Busca usuario, valida acceso,
// verifica password, reinicia intentos, actualiza hash si hace falta y devuelve token.
const login = async (req, res) => {
  await ensureUsuariosPermisosColumn();
  const { nombreUsuario, password } = req.body;
  const identifier = String(nombreUsuario || '').trim();
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Rellena todos los campos.' });
  }

  const [rows] = await pool.query(
    `${USER_SELECT} WHERE nombre_usuario = ? OR LOWER(email) = ? LIMIT 1`,
    [identifier, identifier.toLowerCase()]
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
    return registerFailedAttempt(row, res);
  }

  await resetLoginAttempts(row.id);

  if (needsPasswordRehash(row.password)) {
    const hashedPassword = hashPassword(password);
    await pool.execute('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, row.id]);
  }

  res.json(buildAuthPayload(row));
};

// CONTROLADOR BACKEND - USUARIO ACTUAL:
// Devuelve los permisos vigentes del usuario autenticado para refrescar el menu sin relogin.
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

// CONTROLADOR BACKEND - LOGIN CON GOOGLE:
// Endpoint usado por el boton Google. Valida token con Google, busca usuario por email,
// valida permisos/estado y devuelve token si el correo existe en la base de datos.
const loginWithGoogle = async (req, res) => {
  await ensureUsuariosPermisosColumn();
  const credential = String(req.body?.credential || '').trim();
  if (!credential) {
    return res.status(400).json({ message: 'Continúa con un correo válido.' });
  }

  let googleUser;
  try {
    googleUser = await verifyGoogleCredential(credential);
  } catch {
    return res.status(401).json({ message: 'Continúa con un correo válido.' });
  }

  const [rows] = await pool.query(
    `${USER_SELECT} WHERE LOWER(email) = ? LIMIT 1`,
    [googleUser.email]
  );

  if (rows.length === 0) {
    return res.status(401).json({ message: 'Continúa con un correo válido.' });
  }

  const row = rows[0];
  const accessError = validateUserAccess(row);
  if (accessError) {
    return res.status(accessError.status).json({ message: accessError.message });
  }

  await resetLoginAttempts(row.id);
  res.json(buildAuthPayload(row, { fotoUrl: googleUser.picture }));
};

module.exports = {
  getCurrentUser,
  login,
  loginWithGoogle
};
