/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-backend/src/utils/passwords.js
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const crypto = require('crypto');

const SCRYPT_PREFIX = 'scrypt';

const hashPassword = (rawPassword) => {
  const password = String(rawPassword || '');
  if (!password) {
    throw new Error('Password requerida.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}$${salt}$${hash}`;
};

// LOGICA: verify Password concentra una operacion de este archivo.
const verifyPassword = (storedPassword, rawPassword) => {
  const stored = String(storedPassword || '');
  const password = String(rawPassword || '');
  if (!stored || !password) return false;

  if (!stored.startsWith(`${SCRYPT_PREFIX}$`)) {
    return stored === password;
  }

  const [, salt, expectedHash] = stored.split('$');
  if (!salt || !expectedHash) return false;

  const actualHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
};

// LOGICA: needs Password Rehash concentra una operacion de este archivo.
const needsPasswordRehash = (storedPassword) => {
  return !String(storedPassword || '').startsWith(`${SCRYPT_PREFIX}$`);
};

module.exports = {
  hashPassword,
  verifyPassword,
  needsPasswordRehash
};
