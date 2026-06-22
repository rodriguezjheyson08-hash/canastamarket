/*
 * MAPA DEL ARCHIVO: HOOK FRONTEND
 * UBICACION: pos-frontend/src/hooks/useI18n.ts
 * QUE HACE: Logica reutilizable de React.
 * GUIA: usa comentarios DISEÑO/LOGICA/RUTA/SERVICIO para ubicar rapido donde cambiar algo.
 */
// HOOK FRONTEND - TEXTOS:
// Devuelve funcion t() para mostrar textos en español/ingles segun configuracion.
import { enUS, es as esLocale } from 'date-fns/locale';
import { useCallback } from 'react';
import { useAppConfig } from './useAppConfig';

// HOOK FRONTEND: bloque use I18n.
export const useI18n = () => {
  const { idioma } = useAppConfig();
  const isEnglish = idioma === 'en';
  const t = useCallback(
    (spanishText: string, englishText: string) => (isEnglish ? englishText : spanishText),
    [isEnglish]
  );

  return {
    idioma,
    isEnglish,
    localeCode: isEnglish ? 'en-US' : 'es-PE',
    dateLocale: isEnglish ? enUS : esLocale,
    t
  };
};
