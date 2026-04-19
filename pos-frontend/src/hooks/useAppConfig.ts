import { useCallback, useEffect, useState } from 'react';
import { AppConfig, applyAppConfigToDocument, loadAppConfig } from '../utils/appConfig';

export const useAppConfig = (): AppConfig => {
  const [config, setConfig] = useState<AppConfig>(() => loadAppConfig());

  const reloadConfig = useCallback(() => {
    setConfig(loadAppConfig());
  }, []);

  useEffect(() => {
    window.addEventListener('configAppUpdate', reloadConfig);
    window.addEventListener('storage', reloadConfig);

    return () => {
      window.removeEventListener('configAppUpdate', reloadConfig);
      window.removeEventListener('storage', reloadConfig);
    };
  }, [reloadConfig]);

  useEffect(() => {
    applyAppConfigToDocument(config);
  }, [config]);

  return config;
};
