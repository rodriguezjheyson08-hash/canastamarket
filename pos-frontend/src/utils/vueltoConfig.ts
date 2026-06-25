/*
 * MAPA DEL ARCHIVO: UTILIDAD FRONTEND
 * UBICACION: pos-frontend/src/utils/vueltoConfig.ts
 * QUE HACE: Guarda y carga el fondo de efectivo disponible para dar vueltos.
 */
export interface VueltoConfig {
  montoBase: number;
}

export const VUELTO_CONFIG_STORAGE_KEY = 'vueltoConfig';
export const VUELTO_CONFIG_UPDATE_EVENT = 'vueltoConfigUpdate';

export const DEFAULT_VUELTO_CONFIG: VueltoConfig = {
  montoBase: 0
};

const normalizeMoney = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Number(parsed.toFixed(2));
};

export const normalizeVueltoConfig = (input: Partial<VueltoConfig> | null | undefined): VueltoConfig => ({
  montoBase: normalizeMoney(input?.montoBase)
});

export const loadVueltoConfig = (): VueltoConfig => {
  try {
    const saved = globalThis.localStorage.getItem(VUELTO_CONFIG_STORAGE_KEY);
    if (!saved) return { ...DEFAULT_VUELTO_CONFIG };
    return normalizeVueltoConfig(JSON.parse(saved) as Partial<VueltoConfig>);
  } catch {
    return { ...DEFAULT_VUELTO_CONFIG };
  }
};

export const saveVueltoConfig = (config: Partial<VueltoConfig>): VueltoConfig => {
  const normalized = normalizeVueltoConfig(config);
  globalThis.localStorage.setItem(VUELTO_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  globalThis.dispatchEvent(new Event('storage'));
  globalThis.dispatchEvent(new Event(VUELTO_CONFIG_UPDATE_EVENT));
  return normalized;
};
