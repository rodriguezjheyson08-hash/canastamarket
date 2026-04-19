const crypto = require('crypto');
const env = require('../config/env');

const base64UrlEncode = (input) => Buffer.from(input).toString('base64url');
const base64UrlDecode = (input) => Buffer.from(String(input || ''), 'base64url').toString('utf8');

const getAuthSecret = () => String(env.auth?.secret || '').trim();

const signPart = (headerPart, payloadPart) => {
  const secret = getAuthSecret();
  return crypto.createHmac('sha256', secret).update(`${headerPart}.${payloadPart}`).digest('base64url');
};

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const createToken = ({ sub, role, type, expiresInSeconds = 60 * 60 * 12 }) => {
  const now = Math.floor(Date.now() / 1000);
  const headerPart = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadPart = base64UrlEncode(JSON.stringify({
    sub,
    role: role || null,
    type: type || 'admin',
    iat: now,
    exp: now + Number(expiresInSeconds || 0)
  }));
  const signature = signPart(headerPart, payloadPart);
  return `${headerPart}.${payloadPart}.${signature}`;
};

const verifyToken = (token) => {
  const raw = String(token || '').trim();
  const parts = raw.split('.');
  if (parts.length !== 3) {
    throw new Error('Token inválido.');
  }

  const [headerPart, payloadPart, signature] = parts;
  const expectedSignature = signPart(headerPart, payloadPart);
  if (!safeEqual(signature, expectedSignature)) {
    throw new Error('Firma inválida.');
  }

  const payload = JSON.parse(base64UrlDecode(payloadPart));
  const now = Math.floor(Date.now() / 1000);
  if (!payload?.exp || Number(payload.exp) <= now) {
    throw new Error('Token expirado.');
  }

  return payload;
};

module.exports = {
  createToken,
  verifyToken
};
