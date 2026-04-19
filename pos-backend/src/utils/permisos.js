const PERMISSION_KEYS = [
  'ventas',
  'pedidos',
  'reparto',
  'mesas',
  'productos',
  'proveedores',
  'categorias',
  'reportes',
  'detalleCajero',
  'configuracion'
];

const DEFAULT_ADMIN_PERMISOS = {
  ventas: true,
  pedidos: true,
  reparto: true,
  mesas: true,
  productos: true,
  proveedores: true,
  categorias: true,
  reportes: true,
  detalleCajero: true,
  configuracion: true
};

const DEFAULT_CAJERO_PERMISOS = {
  ventas: true,
  pedidos: true,
  reparto: false,
  mesas: true,
  productos: false,
  proveedores: false,
  categorias: false,
  reportes: false,
  detalleCajero: false,
  configuracion: true
};

const DEFAULT_REPARTIDOR_PERMISOS = {
  ventas: false,
  pedidos: false,
  reparto: true,
  mesas: false,
  productos: false,
  proveedores: false,
  categorias: false,
  reportes: false,
  detalleCajero: false,
  configuracion: true
};

const parsePermisos = (permisos) => {
  if (!permisos) return {};
  if (typeof permisos === 'object') return permisos;
  try {
    const parsed = JSON.parse(permisos);
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch {
    return {};
  }
};

const normalizePermisos = (rol, permisos) => {
  const isAdmin = String(rol || '').toUpperCase() === 'ADMINISTRADOR';
  const isRepartidor = String(rol || '').toUpperCase() === 'REPARTIDOR';
  const base = isAdmin ? DEFAULT_ADMIN_PERMISOS : (isRepartidor ? DEFAULT_REPARTIDOR_PERMISOS : DEFAULT_CAJERO_PERMISOS);
  const input = parsePermisos(permisos);
  const normalized = { ...base };

  PERMISSION_KEYS.forEach((key) => {
    if (typeof input[key] === 'boolean') {
      normalized[key] = input[key];
    }
  });

  if (isAdmin) {
    PERMISSION_KEYS.forEach((key) => {
      normalized[key] = true;
    });
  }

  return normalized;
};

module.exports = {
  PERMISSION_KEYS,
  DEFAULT_ADMIN_PERMISOS,
  DEFAULT_CAJERO_PERMISOS,
  DEFAULT_REPARTIDOR_PERMISOS,
  normalizePermisos
};
