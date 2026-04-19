import { useCallback, useEffect, useState } from 'react';
import { getTiendaConfig, TiendaConfig, updateTiendaConfig } from '../services/tienda';
import { getErrorMessage } from '../utils/errorMessage';

type UseTiendaConfigOptions = {
  enabled?: boolean;
};

type UseTiendaConfigState = {
  config: TiendaConfig | null;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  save: (payload: Partial<TiendaConfig>) => Promise<TiendaConfig | null>;
};

export const useTiendaConfig = (options: UseTiendaConfigOptions = {}): UseTiendaConfigState => {
  const { enabled = true } = options;
  const [config, setConfig] = useState<TiendaConfig | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await getTiendaConfig();
      setConfig(data);
    } catch (error: unknown) {
      setConfig(null);
      setError(getErrorMessage(error, 'No se pudo cargar la configuración de la tienda.'));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void reload();
  }, [enabled, reload]);

  const save = useCallback(async (payload: Partial<TiendaConfig>) => {
    setError('');
    try {
      const updated = await updateTiendaConfig(payload);
      setConfig(updated);
      return updated;
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'No se pudo guardar la configuración de la tienda.'));
      return null;
    }
  }, []);

  return { config, loading, error, reload, save };
};
