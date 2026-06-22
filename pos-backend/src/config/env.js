/*
 * MAPA DEL ARCHIVO: CONFIGURACION BACKEND
 * UBICACION: pos-backend/src/config/env.js
 * QUE HACE: Lee y centraliza configuracion del servidor.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// CONFIGURACION BACKEND - VARIABLES DE ENTORNO:
// Centraliza puertos, credenciales, URLs externas y claves para que controllers/services no lean process.env directo.
// CONFIGURACION BACKEND - CAMBIOS: aqui se ajustan nombres de variables, valores por defecto y lectura de .env.
const path = require('path');
const fs = require('fs');

const resolveEnvPath = () => {
  const cwdEnv = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(cwdEnv)) return cwdEnv;
  // pos-backend/.env (desde src/config/env.js)
  const projectEnv = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(projectEnv)) return projectEnv;
  return cwdEnv;
};

require('dotenv').config({ path: resolveEnvPath() });

const env = {
  port: Number(process.env.PORT) || 8083,
  auth: {
    secret: process.env.AUTH_SECRET || 'change-this-auth-secret'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || ''
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'licoreria_pos',
    ssl: process.env.DB_SSL === 'true',
    caPath: process.env.DB_CA_PATH || ''
  },
  mercadoPago: {
    accessToken: process.env.MP_ACCESS_TOKEN || ''
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID || ''
  },
  reniec: {
    baseUrl: process.env.RENIEC_BASE_URL || 'https://api.decolecta.com/v1/reniec/dni',
    token: process.env.RENIEC_TOKEN || ''
  },
  ruc: {
    baseUrl: process.env.RUC_BASE_URL || 'https://api.decolecta.com/v1/sunat/ruc/full?numero=',
    token: process.env.RUC_TOKEN || process.env.RENIEC_TOKEN || ''
  }
};

module.exports = env;
