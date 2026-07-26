/*
 * MAPA DEL ARCHIVO: HOOK FRONTEND
 * UBICACION: pos-frontend/src/hooks/useAppConfig.ts
 * QUE HACE: Logica reutilizable de React.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// HOOK FRONTEND - CONFIGURACION APP:
// Lee configuracion visual/de negocio que otras pantallas consumen.
// LOGICA FRONTEND - CAMBIOS: aqui se cambia como React obtiene configuracion de la app.
import { useCallback, useEffect, useState } from 'react';
import { APP_CONFIG_UPDATE_EVENT, AppConfig, applyAppConfigToDocument, loadAppConfig, saveAppConfig } from '../utils/appConfig';
import { getConfiguracionPublica } from '../services/api';
import { loadBoletaConfig, saveBoletaConfig } from '../utils/boletaConfig';

const CONFIG_REFRESH_MS = 10_000;
let sharedSyncPromise: Promise<void> | null = null;

// Una sola consulta compartida aunque Header, Login y App usen el hook al mismo tiempo.
const syncGlobalConfig = () => {
  if (sharedSyncPromise) return sharedSyncPromise;

  sharedSyncPromise = getConfiguracionPublica()
    .then(({ personalizacion, boleta }) => {
      if (personalizacion) {
        const current = loadAppConfig();
        if (JSON.stringify(current) !== JSON.stringify(personalizacion)) {
          saveAppConfig(personalizacion);
        }
      }
      if (boleta) {
        const currentBoleta = loadBoletaConfig();
        const nextBoleta = { ...currentBoleta, ...boleta };
        if (JSON.stringify(currentBoleta) !== JSON.stringify(nextBoleta)) {
          saveBoletaConfig(nextBoleta);
        }
      }
    })
    .catch(() => {
      // Si no hay internet se conserva la ultima configuracion conocida del dispositivo.
    })
    .finally(() => {
      sharedSyncPromise = null;
    });

  return sharedSyncPromise;
};

export const useAppConfig = (): AppConfig => {
  const [config, setConfig] = useState<AppConfig>(() => loadAppConfig());

  const reloadConfig = useCallback(() => {
    setConfig(loadAppConfig());
  }, []);

  useEffect(() => {
    globalThis.addEventListener(APP_CONFIG_UPDATE_EVENT, reloadConfig);
    globalThis.addEventListener('storage', reloadConfig);

    return () => {
      globalThis.removeEventListener(APP_CONFIG_UPDATE_EVENT, reloadConfig);
      globalThis.removeEventListener('storage', reloadConfig);
    };
  }, [reloadConfig]);

  useEffect(() => {
    const refresh = () => void syncGlobalConfig();
    const refreshWhenVisible = () => {
      if (globalThis.document?.visibilityState === 'visible') refresh();
    };

    refresh();
    const intervalId = globalThis.setInterval(refresh, CONFIG_REFRESH_MS);
    globalThis.addEventListener('focus', refresh);
    globalThis.document?.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      globalThis.clearInterval(intervalId);
      globalThis.removeEventListener('focus', refresh);
      globalThis.document?.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    applyAppConfigToDocument(config);
  }, [config]);

  return config;
};
