/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/auth.ts
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// UTILIDAD FRONTEND - TOKEN AUTH:
// Guarda, lee y elimina token/datos de usuario en localStorage.
// LOGICA FRONTEND - CAMBIOS: aqui se modifica como se guarda/lee/cierra sesion .
const ADMIN_TOKEN_STORAGE_KEY = 'token';

const parseStoredToken = (storedValue: string): string | null => {
  try {
    if (storedValue.startsWith('{')) {
      return JSON.parse(storedValue).token ?? null;
    }
  } catch {}

  return storedValue;
};

const getStoredToken = (storageKey: string): string | null => {
  const storedValue = globalThis.localStorage.getItem(storageKey);
  if (!storedValue) return null;

  const token = parseStoredToken(storedValue);
  if (token && token.split('.').length === 3) return token;
  return null;
};

export function getToken(): string | null {
  return getStoredToken(ADMIN_TOKEN_STORAGE_KEY);
}
