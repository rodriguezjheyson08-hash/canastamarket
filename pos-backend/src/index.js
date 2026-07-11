/*
 * MAPA DEL ARCHIVO: ENTRADA BACKEND
 * UBICACION: pos-backend/src/index.js
 * QUE HACE: Configura Express, middlewares y rutas principales del servidor.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
// DEPENDENCIAS BACKEND: librerias, helpers y tipos que usa este archivo.
const env = require('./config/env');
const {
  DEFAULT_AUTH_SECRET,
  isProduction,
  logServerUrls,
  parseCorsOrigins
} = require('./config/http');
const securityHeaders = require('./middleware/securityHeaders');
const { collectDebugRoutes } = require('./utils/debugRoutes');

const productosRoutes = require('./routes/productos');
const categoriasRoutes = require('./routes/categorias');
const ventasRoutes = require('./routes/ventas');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const pagosRoutes = require('./routes/pagos');
const pedidosOnlineRoutes = require('./routes/pedidosOnline');
const dniRoutes = require('./routes/dni');
const proveedoresRoutes = require('./routes/proveedores');
const usuariosRoutes = require('./routes/usuarios');
const configuracionRoutes = require('./routes/configuracion');
const cajasRoutes = require('./routes/cajas');
const clientesRoutes = require('./routes/clientes');
const inventarioRoutes = require('./routes/inventario');

const app = express();
app.disable('x-powered-by');

const corsOrigins = parseCorsOrigins(env.cors?.origin);
// RUTA BACKEND: registra middleware o ruta principal de Express.
app.use(cors(
  corsOrigins.length > 0
    ? {
        origin: corsOrigins
      }
    : undefined
));
// RUTA BACKEND: registra middleware o ruta principal de Express.
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(securityHeaders);

// RUTA BACKEND: registra middleware o ruta principal de Express.
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    authConfigured: String(env.auth?.secret || '').trim() !== DEFAULT_AUTH_SECRET,
    corsConfigured: corsOrigins.length > 0,
    smtpConfigured: Boolean(env.smtp?.user && env.smtp?.pass && env.smtp?.from),
    environment: env.runtime.hosted ? 'hosted' : 'local',
    databaseTarget: env.runtime.databaseTarget
  });
});

// Debug: listar rutas (solo para desarrollo)
if (!isProduction) {
// RUTA BACKEND: registra middleware o ruta principal de Express.
  app.get('/api/_debug/routes', (_req, res) => {
    res.json({ routes: collectDebugRoutes(app) });
  });
}

// RUTA BACKEND: registra middleware o ruta principal de Express.
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/pedidos-online', pedidosOnlineRoutes);
// RUTA BACKEND: registra middleware o ruta principal de Express.
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pagos', pagosRoutes);
// RUTA BACKEND: registra middleware o ruta principal de Express.
app.use('/api/dni', dniRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/cajas', cajasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/inventario', inventarioRoutes);

// RUTA BACKEND: registra middleware o ruta principal de Express.
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  let message = err.message || 'Error interno del servidor.';

  // Evitar exponer require stacks al frontend.
  if (err?.code === 'MODULE_NOT_FOUND' && typeof message === 'string') {
    message = 'Falta una dependencia del servidor. Ejecuta npm install y reinicia el backend.';
  }
  res.status(status).json({
    message
  });
});

if (require.main === module) {
  app.listen(env.port, '0.0.0.0', () => {
    if (String(env.auth?.secret || '').trim() === DEFAULT_AUTH_SECRET) {
      console.warn('AUTH_SECRET no está configurado. Cambia esa clave antes de producción.');
    }
    logServerUrls(env.port);
  });
}

module.exports = app;
