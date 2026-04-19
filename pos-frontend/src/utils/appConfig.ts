export interface AppConfig {
  appName: string;
  idioma: string;
  moneda: string;
  logo: string;
  userImg: string;
}

export const APP_CONFIG_STORAGE_KEY = 'configApp';

export const DEFAULT_APP_CONFIG: AppConfig = {
  appName: 'Sistema POS',
  idioma: 'es',
  moneda: 'S/',
  logo: '',
  userImg: ''
};

export const applyAppConfigToDocument = (config: AppConfig): void => {
  if (typeof document === 'undefined') return;

  document.title = config.appName;

  const descriptionMeta = document.querySelector('meta[name="description"]');
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

export const loadAppConfig = (): AppConfig => {
  try {
    const saved = localStorage.getItem(APP_CONFIG_STORAGE_KEY);
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

export const saveAppConfig = (config: Partial<AppConfig>): AppConfig => {
  const normalized = normalizeAppConfig(config);
  localStorage.setItem(APP_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  applyAppConfigToDocument(normalized);
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new Event('configAppUpdate'));
  return normalized;
};

export const saveMergedAppConfig = (config: Partial<AppConfig>): AppConfig => {
  const current = loadAppConfig();
  return saveAppConfig({ ...current, ...config });
};
