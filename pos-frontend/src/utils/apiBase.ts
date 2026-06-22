/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/apiBase.ts
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const normalizeApiUrl = (rawUrl: string) => {
  const value = String(rawUrl || '').trim().replace(/\/+$/, '');
  if (!value) return value;
  if (value.startsWith('/')) {
    return value.endsWith('/api') ? value : `${value}/api`;
  }
  return value.endsWith('/api') ? value : `${value}/api`;
};

// LOGICA: can Use Window Location concentra una operacion de este archivo.
const canUseWindowLocation = () =>
  typeof globalThis.location !== 'undefined' && Boolean(globalThis.location?.hostname);

const buildWindowApiUrl = () => {
  if (!canUseWindowLocation()) return '';
  const hostname = String(globalThis.location.hostname || '').trim().toLowerCase();
  if (!LOCAL_HOSTS.has(hostname)) {
    return '/api';
  }
  const protocol = globalThis.location.protocol || 'http:';
  return normalizeApiUrl(`${protocol}//${hostname}:8083`);
};

// LOGICA: resolve Api Url encapsula una operacion reutilizable.
export const resolveApiUrl = () => {
  const configuredUrl = normalizeApiUrl(process.env.REACT_APP_API_URL || '');
  if (!configuredUrl) {
    return buildWindowApiUrl() || normalizeApiUrl('http://localhost:8083');
  }

  if (!canUseWindowLocation()) {
    return configuredUrl;
  }

  try {
    const configured = new URL(configuredUrl);
    const currentHost = String(globalThis.location.hostname || '').trim().toLowerCase();
    const configuredHost = String(configured.hostname || '').trim().toLowerCase();

    if (!LOCAL_HOSTS.has(currentHost) && LOCAL_HOSTS.has(configuredHost)) {
      return buildWindowApiUrl() || configuredUrl;
    }
  } catch {
    return configuredUrl;
  }

  return configuredUrl;
};

// CONSTANTE: API_URL guarda un valor fijo usado por este bloque.
export const API_URL = resolveApiUrl();
