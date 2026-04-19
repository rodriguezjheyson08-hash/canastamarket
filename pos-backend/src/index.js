const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');

const productosRoutes = require('./routes/productos');
const categoriasRoutes = require('./routes/categorias');
const ventasRoutes = require('./routes/ventas');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const pagosRoutes = require('./routes/pagos');
const dniRoutes = require('./routes/dni');
const clientesRoutes = require('./routes/clientes');
const pedidosRoutes = require('./routes/pedidos');
const repartidoresRoutes = require('./routes/repartidores');
const proveedoresRoutes = require('./routes/proveedores');
const tiendaRoutes = require('./routes/tienda');

const app = express();
app.disable('x-powered-by');

const DEFAULT_AUTH_SECRET = 'change-this-auth-secret';
const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

const parseCorsOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getRouteMethods = (route) => Object.keys(route.methods || {}).filter((method) => route.methods[method]);

const collectDebugRoutes = () => {
  const routes = [];
  const stack = app._router?.stack || [];

  for (const layer of stack) {
    if (layer?.route?.path) {
      routes.push({ path: layer.route.path, methods: getRouteMethods(layer.route) });
      continue;
    }

    if (layer?.name !== 'router' || !layer?.handle?.stack) {
      continue;
    }

    for (const nestedLayer of layer.handle.stack) {
      if (!nestedLayer?.route?.path) {
        continue;
      }

      routes.push({
        path: nestedLayer.route.path,
        methods: getRouteMethods(nestedLayer.route),
        base: layer.regexp?.toString?.() || ''
      });
    }
  }

  return routes;
};

const logServerUrls = (port) => {
  console.log('API escuchando en:');
  console.log(`Local:  http://localhost:${port}`);
  console.log(`Red:    http://192.168.56.1:${port}`);
};

const corsOrigins = parseCorsOrigins(env.cors?.origin);
app.use(cors(
  corsOrigins.length > 0
    ? {
        origin: corsOrigins
      }
    : undefined
));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
  if (isProduction && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    authConfigured: String(env.auth?.secret || '').trim() !== DEFAULT_AUTH_SECRET,
    corsConfigured: corsOrigins.length > 0
  });
});

// Debug: listar rutas (solo para desarrollo)
if (!isProduction) {
  app.get('/api/_debug/routes', (_req, res) => {
    res.json({ routes: collectDebugRoutes() });
  });
}

app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/dni', dniRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/repartidores', repartidoresRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/tienda', tiendaRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  let message = err.message || 'Error interno del servidor.';

  // Evitar exponer require stacks al frontend.
  if (err?.code === 'MODULE_NOT_FOUND' && typeof message === 'string') {
    if (message.includes('google-auth-library')) {
      message =
        "Falta dependencia 'google-auth-library'. Ejecuta: npm -C pos-backend install y reinicia el backend.";
    } else {
      message = 'Falta una dependencia del servidor. Ejecuta npm install y reinicia el backend.';
    }
  }
  res.status(status).json({
    message
  });
});

app.listen(env.port, '0.0.0.0', () => {
  if (String(env.auth?.secret || '').trim() === DEFAULT_AUTH_SECRET) {
    console.warn('AUTH_SECRET no está configurado. Cambia esa clave antes de producción.');
  }
  logServerUrls(env.port);
});
