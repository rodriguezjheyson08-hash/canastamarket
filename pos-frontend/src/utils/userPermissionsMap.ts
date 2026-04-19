import { UserPermissions } from '../types';

const USER_PERMISSIONS_MAP_KEY = 'userPermissionsMap';

type PermissionsMap = Record<string, Partial<UserPermissions>>;

export const loadUserPermissionsMap = (): PermissionsMap => {
  try {
    const raw = localStorage.getItem(USER_PERMISSIONS_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as PermissionsMap;
  } catch {
    return {};
  }
};

export const saveUserPermissionsMap = (map: PermissionsMap) => {
  localStorage.setItem(USER_PERMISSIONS_MAP_KEY, JSON.stringify(map));
};

export const setUserPermissionsForId = (userId: number, permissions: Partial<UserPermissions>) => {
  if (!userId) return;
  const map = loadUserPermissionsMap();
  map[String(userId)] = permissions;
  saveUserPermissionsMap(map);
};

export const getUserPermissionsForId = (userId?: number | null): Partial<UserPermissions> | null => {
  if (!userId) return null;
  const map = loadUserPermissionsMap();
  return map[String(userId)] || null;
};
