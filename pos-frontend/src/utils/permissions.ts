import { PermissionKey, User, UserPermissions } from '../types';

export const PERMISSION_KEYS: PermissionKey[] = [
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

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  ventas: 'Ventas',
  pedidos: 'Pedidos',
  reparto: 'Reparto',
  mesas: 'Mesas',
  productos: 'Productos',
  proveedores: 'Proveedores',
  categorias: 'Categorias',
  reportes: 'Reportes',
  detalleCajero: 'Detalle cajero',
  configuracion: 'Configuracion'
};

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
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

export const DEFAULT_CAJERO_PERMISSIONS: UserPermissions = {
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

export const DEFAULT_REPARTIDOR_PERMISSIONS: UserPermissions = {
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

export const normalizePermissions = (
  rol: 'ADMINISTRADOR' | 'CAJERO' | 'REPARTIDOR' | string | undefined,
  permissions?: Partial<UserPermissions> | null
): UserPermissions => {
  const isAdmin = String(rol || '').toUpperCase() === 'ADMINISTRADOR';
  const isRepartidor = String(rol || '').toUpperCase() === 'REPARTIDOR';
  const base = isAdmin ? DEFAULT_ADMIN_PERMISSIONS : (isRepartidor ? DEFAULT_REPARTIDOR_PERMISSIONS : DEFAULT_CAJERO_PERMISSIONS);
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

export const canAccess = (user: User | null | undefined, permission: PermissionKey): boolean => {
  if (!user) return false;
  const permissions = normalizePermissions(user.rol, user.permisos || null);
  return Boolean(permissions[permission]);
};

export const getPermissionLabel = (permission: PermissionKey, idioma: string): string => {
  if (idioma !== 'en') return PERMISSION_LABELS[permission];

  const englishLabels: Record<PermissionKey, string> = {
    ventas: 'Sales',
    pedidos: 'Orders',
    reparto: 'Delivery',
    mesas: 'Tables',
    productos: 'Products',
    proveedores: 'Suppliers',
    categorias: 'Categories',
    reportes: 'Reports',
    detalleCajero: 'Cashier Details',
    configuracion: 'Settings'
  };

  return englishLabels[permission];
};
