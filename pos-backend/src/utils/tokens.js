/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-backend/src/utils/tokens.js
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const crypto = require('crypto');
const env = require('../config/env');

const base64UrlEncode = (input) => Buffer.from(input).toString('base64url');
// LOGICA: base64 Url Decode concentra una operacion de este archivo.
const base64UrlDecode = (input) => Buffer.from(String(input || ''), 'base64url').toString('utf8');

const getAuthSecret = () => String(env.auth?.secret || '').trim();

const signPart = (headerPart, payloadPart) => {
  const secret = getAuthSecret();
  return crypto.createHmac('sha256', secret).update(`${headerPart}.${payloadPart}`).digest('base64url');
};

// LOGICA: safe Equal concentra una operacion de este archivo.
const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

// LOGICA: create Token concentra una operacion de este archivo.
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

// LOGICA: verify Token concentra una operacion de este archivo.
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
