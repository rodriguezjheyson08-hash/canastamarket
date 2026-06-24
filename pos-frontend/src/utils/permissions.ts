/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/permissions.ts
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import { PermissionKey, User, UserPermissions } from '../types';

export const PERMISSION_KEYS: PermissionKey[] = [
  'ventas',
  'productos',
  'categorias',
  'proveedores',
  'pedidosOnline',
  'reportes',
  'configuracion'
];

// CONSTANTE: PERMISSION_LABELS guarda un valor fijo usado por este bloque.
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  ventas: 'Ventas',
  productos: 'Productos',
  categorias: 'Categorías',
  proveedores: 'Proveedores',
  pedidosOnline: 'Pedidos Online',
  reportes: 'Reportes',
  configuracion: 'Configuración'
};

// CONSTANTE: DEFAULT_ADMIN_PERMISSIONS guarda un valor fijo usado por este bloque.
export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  ventas: true,
  productos: true,
  categorias: true,
  proveedores: true,
  pedidosOnline: true,
  reportes: true,
  configuracion: true
};

// CONSTANTE: DEFAULT_CAJERO_PERMISSIONS guarda un valor fijo usado por este bloque.
export const DEFAULT_CAJERO_PERMISSIONS: UserPermissions = {
  ventas: true,
  productos: false,
  categorias: false,
  proveedores: false,
  pedidosOnline: false,
  reportes: false,
  configuracion: false
};

// LOGICA: normalize Permissions encapsula una operacion reutilizable.
export const normalizePermissions = (
  rol: 'ADMINISTRADOR' | 'CAJERO' | string | undefined,
  permissions?: Partial<UserPermissions> | null
): UserPermissions => {
  const isAdmin = String(rol || '').toUpperCase() === 'ADMINISTRADOR';
  const base = isAdmin ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_CAJERO_PERMISSIONS;
  const normalized: UserPermissions = { ...base };
  const source = permissions || {};

  PERMISSION_KEYS.forEach((key) => {
    if (typeof source[key] === 'boolean') {
      normalized[key] = source[key] as boolean;
    }
  });

  if (isAdmin) {
    PERMISSION_KEYS.forEach((key) => {
      normalized[key] = true;
    });
  }

  return normalized;
};

// LOGICA: can Access encapsula una operacion reutilizable.
export const canAccess = (user: User | null | undefined, permission: PermissionKey): boolean => {
  if (!user) return false;
  const permissions = normalizePermissions(user.rol, user.permisos || null);
  return Boolean(permissions[permission]);
};
