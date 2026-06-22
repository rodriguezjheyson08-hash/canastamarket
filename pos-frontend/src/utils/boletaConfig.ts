/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/boletaConfig.ts
 * QUE HACE: Funciones auxiliares reutilizables.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
import { loadAppConfig } from './appConfig';

export interface BoletaConfig {
  nombre: string;
  ruc: string;
  direccion: string;
  telefono: string;
  serie: string;
  logo: string;
}

// CONSTANTE: BOLETA_CONFIG_STORAGE_KEY guarda un valor fijo usado por este bloque.
export const BOLETA_CONFIG_STORAGE_KEY = 'boletaConfig';
export const BOLETA_CONFIG_UPDATE_EVENT = 'boletaConfigUpdate';

const defaultLogo = `${process.env.PUBLIC_URL}/images/Logo Market.png`;

// CONSTANTE: DEFAULT_BOLETA_CONFIG guarda un valor fijo usado por este bloque.
export const DEFAULT_BOLETA_CONFIG: BoletaConfig = {
  nombre: 'SISTEMA POS',
  ruc: '20599988877',
  direccion: 'Av. America Sur',
  telefono: '975929943',
  serie: '001',
  logo: defaultLogo
};

const getDefaultBoletaConfig = (): BoletaConfig => ({
  ...DEFAULT_BOLETA_CONFIG,
  nombre: loadAppConfig().appName.toUpperCase()
});

const getTrimmedString = (value: unknown): string => String(value ?? '').trim();

const normalizeBoletaConfig = (input: Partial<BoletaConfig> | null | undefined): BoletaConfig => {
  const defaults = getDefaultBoletaConfig();
  const raw = input || {};
// LOGICA: has Field concentra una operacion de este archivo.
  const hasField = (field: keyof BoletaConfig) => Object.prototype.hasOwnProperty.call(raw, field);
  const getOptionalField = (field: keyof BoletaConfig, fallback: string) =>
    hasField(field) ? getTrimmedString(raw[field]) : fallback;

  const nombre = getTrimmedString(raw.nombre);
  const serie = getTrimmedString(raw.serie);
  const logo = getTrimmedString(raw.logo);

  return {
    nombre: nombre || defaults.nombre,
    ruc: getOptionalField('ruc', defaults.ruc),
    direccion: getOptionalField('direccion', defaults.direccion),
    telefono: getOptionalField('telefono', defaults.telefono),
    serie: serie || defaults.serie,
    logo: logo || defaults.logo
  };
};

// LOGICA: load Boleta Config encapsula una operacion reutilizable.
export const loadBoletaConfig = (): BoletaConfig => {
  try {
    const saved = globalThis.localStorage.getItem(BOLETA_CONFIG_STORAGE_KEY);
    if (!saved) return normalizeBoletaConfig(undefined);
    const parsed = JSON.parse(saved) as Partial<BoletaConfig>;
    return normalizeBoletaConfig(parsed);
  } catch {
    return normalizeBoletaConfig(undefined);
  }
};

// LOGICA: save Boleta Config encapsula una operacion reutilizable.
export const saveBoletaConfig = (config: Partial<BoletaConfig>): BoletaConfig => {
  const normalized = normalizeBoletaConfig(config);
  globalThis.localStorage.setItem(BOLETA_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  globalThis.dispatchEvent(new Event('storage'));
  globalThis.dispatchEvent(new Event(BOLETA_CONFIG_UPDATE_EVENT));
  return normalized;
};
