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

const isLocalDatabaseHost = (host) => {
  const normalized = String(host || '').trim().toLowerCase();
  return ['localhost', '127.0.0.1', '::1'].includes(normalized);
};

const validateDatabaseIsolation = ({ host, hosted, allowRemoteDevelopment }) => {
  const localHost = isLocalDatabaseHost(host);

  if (hosted && localHost) {
    throw new Error('Configuracion insegura: un despliegue no puede conectarse a una base de datos local.');
  }

  if (!hosted && !localHost && !allowRemoteDevelopment) {
    throw new Error(
      'Configuracion bloqueada: el entorno local no puede usar una base remota. ' +
      'Usa MySQL local o define ALLOW_REMOTE_DB_IN_DEVELOPMENT=true de forma consciente.'
    );
  }
};

const hosted = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  String(process.env.NODE_ENV || '').toLowerCase() === 'production'
);
const allowRemoteDevelopment = process.env.ALLOW_REMOTE_DB_IN_DEVELOPMENT === 'true';
const dbHost = process.env.DB_HOST || 'localhost';

validateDatabaseIsolation({ host: dbHost, hosted, allowRemoteDevelopment });

const env = {
  port: Number(process.env.PORT) || 8083,
  auth: {
    secret: process.env.AUTH_SECRET || 'change-this-auth-secret'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || ''
  },
  db: {
    host: dbHost,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: isLocalDatabaseHost(dbHost)
      ? (process.env.DB_LOCAL_PASSWORD || process.env.DB_PASSWORD || '')
      : (process.env.DB_PASSWORD || ''),
    name: process.env.DB_NAME || 'licoreria_pos',
    ssl: process.env.DB_SSL === 'true',
    caPath: process.env.DB_CA_PATH || '',
    timeZone: process.env.DB_TIME_ZONE || '-05:00'
  },
  runtime: {
    hosted,
    databaseTarget: isLocalDatabaseHost(dbHost) ? 'local' : 'hosted'
  },
  mercadoPago: {
    accessToken: process.env.MP_ACCESS_TOKEN || ''
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID || ''
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: String(process.env.SMTP_SECURE ?? 'true').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || ''
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
module.exports.isLocalDatabaseHost = isLocalDatabaseHost;
module.exports.validateDatabaseIsolation = validateDatabaseIsolation;
