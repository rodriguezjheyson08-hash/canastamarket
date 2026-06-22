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
import { AppConfig, applyAppConfigToDocument, loadAppConfig } from '../utils/appConfig';

export const useAppConfig = (): AppConfig => {
  const [config, setConfig] = useState<AppConfig>(() => loadAppConfig());

  const reloadConfig = useCallback(() => {
    setConfig(loadAppConfig());
  }, []);

  useEffect(() => {
    globalThis.addEventListener('configAppUpdate', reloadConfig);
    globalThis.addEventListener('storage', reloadConfig);

    return () => {
      globalThis.removeEventListener('configAppUpdate', reloadConfig);
      globalThis.removeEventListener('storage', reloadConfig);
    };
  }, [reloadConfig]);

  useEffect(() => {
    applyAppConfigToDocument(config);
  }, [config]);

  return config;
};
