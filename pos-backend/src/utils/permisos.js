/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-backend/src/utils/permisos.js
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const PERMISSION_KEYS = [
  'ventas',
  'productos',
  'categorias',
  'proveedores',
  'inventario',
  'pedidosOnline',
  'reportes',
  'configuracion'
];

// CONSTANTE: DEFAULT_ADMIN_PERMISOS guarda configuracion o valor fijo del archivo.
const DEFAULT_ADMIN_PERMISOS = {
  ventas: true,
  productos: true,
  categorias: true,
  proveedores: true,
  inventario: true,
  pedidosOnline: true,
  reportes: true,
  configuracion: true
};

// CONSTANTE: DEFAULT_CAJERO_PERMISOS guarda configuracion o valor fijo del archivo.
const DEFAULT_CAJERO_PERMISOS = {
  ventas: true,
  productos: true,
  categorias: true,
  proveedores: true,
  inventario: false,
  pedidosOnline: true,
  reportes: true,
  configuracion: false
};

// LOGICA: parse Permisos concentra una operacion de este archivo.
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

// LOGICA: normalize Permisos concentra una operacion de este archivo.
const normalizePermisos = (rol, permisos) => {
  const isAdmin = String(rol || '').toUpperCase() === 'ADMINISTRADOR';
  const base = isAdmin ? DEFAULT_ADMIN_PERMISOS : DEFAULT_CAJERO_PERMISOS;
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
  normalizePermisos
};
