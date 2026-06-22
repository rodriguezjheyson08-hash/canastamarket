/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/appConfig.ts
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
export interface AppConfig {
  appName: string;
  idioma: string;
  moneda: string;
  logo: string;
  userImg: string;
}

// CONSTANTE: APP_CONFIG_STORAGE_KEY guarda un valor fijo usado por este bloque.
export const APP_CONFIG_STORAGE_KEY = 'configApp';

export const DEFAULT_APP_CONFIG: AppConfig = {
  appName: 'Sistema POS',
  idioma: 'es',
  moneda: 'S/',
  logo: '',
  userImg: ''
};

// LOGICA: apply App Config To Document encapsula una operacion reutilizable.
export const applyAppConfigToDocument = (config: AppConfig): void => {
  if (typeof globalThis.document === 'undefined') return;

  globalThis.document.title = config.appName;

  const descriptionMeta = globalThis.document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    descriptionMeta.setAttribute('content', config.appName);
  }
};

const normalizeAppConfig = (input: Partial<AppConfig> | null | undefined): AppConfig => {
  const raw = input || {};
  const appName = String(raw.appName || '').trim();
  const idioma = String(raw.idioma || '').trim();
  const moneda = String(raw.moneda || '').trim();
  const logo = String(raw.logo || '').trim();
  const userImg = String(raw.userImg || '').trim();

  return {
    appName: appName || DEFAULT_APP_CONFIG.appName,
    idioma: idioma || DEFAULT_APP_CONFIG.idioma,
    moneda: moneda || DEFAULT_APP_CONFIG.moneda,
    logo,
    userImg
  };
};

// LOGICA: load App Config encapsula una operacion reutilizable.
export const loadAppConfig = (): AppConfig => {
  try {
    const saved = globalThis.localStorage.getItem(APP_CONFIG_STORAGE_KEY);
    if (!saved) {
      applyAppConfigToDocument(DEFAULT_APP_CONFIG);
      return { ...DEFAULT_APP_CONFIG };
    }
    const parsed = JSON.parse(saved) as Partial<AppConfig>;
    const normalized = normalizeAppConfig(parsed);
    applyAppConfigToDocument(normalized);
    return normalized;
  } catch {
    applyAppConfigToDocument(DEFAULT_APP_CONFIG);
    return { ...DEFAULT_APP_CONFIG };
  }
};

// LOGICA: save App Config encapsula una operacion reutilizable.
export const saveAppConfig = (config: Partial<AppConfig>): AppConfig => {
  const normalized = normalizeAppConfig(config);
  globalThis.localStorage.setItem(APP_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  applyAppConfigToDocument(normalized);
  globalThis.dispatchEvent(new Event('storage'));
  globalThis.dispatchEvent(new Event('configAppUpdate'));
  return normalized;
};
