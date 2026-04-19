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
    name: process.env.DB_NAME || 'licoreria_pos'
  },
  mercadoPago: {
    accessToken: process.env.MP_ACCESS_TOKEN || ''
  },
  reniec: {
    baseUrl: process.env.RENIEC_BASE_URL || 'https://api.decolecta.com/v1/reniec/dni',
    token: process.env.RENIEC_TOKEN || ''
  },
  ruc: {
    // Por defecto apuntamos al endpoint "full" de Decolecta (requiere token).
    baseUrl: process.env.RUC_BASE_URL || 'https://api.decolecta.com/v1/sunat/ruc/full?numero=',
    // Si no hay RUC_TOKEN, reusamos RENIEC_TOKEN (Decolecta usa el mismo token para servicios).
    token: process.env.RUC_TOKEN || process.env.RENIEC_TOKEN || ''
  }
};

module.exports = env;
