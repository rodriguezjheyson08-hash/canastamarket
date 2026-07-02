const crypto = require('crypto');
const env = require('../../config/env');

const PASSWORD_MESSAGE = 'La contraseña debe tener 8 caracteres, mayúscula, minúscula y número.';
const isStrongPassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(String(value || ''));
const generateCode = () => String(crypto.randomInt(100000, 1000000));
const hashCode = ({ email, accountType, code }) => crypto
  .createHmac('sha256', String(env.auth.secret))
  .update(`${String(accountType)}:${String(email).toLowerCase()}:${String(code)}`)
  .digest('hex');
const safeCodeEqual = (actual, expected) => {
  const left = Buffer.from(String(actual || ''), 'hex');
  const right = Buffer.from(String(expected || ''), 'hex');
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
};

module.exports = { PASSWORD_MESSAGE, isStrongPassword, generateCode, hashCode, safeCodeEqual };
