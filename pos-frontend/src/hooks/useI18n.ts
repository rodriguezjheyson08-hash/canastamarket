import { enUS, es as esLocale } from 'date-fns/locale';
import { useAppConfig } from './useAppConfig';

export const useI18n = () => {
  const { idioma } = useAppConfig();
  const isEnglish = idioma === 'en';

  return {
    idioma,
    isEnglish,
    localeCode: isEnglish ? 'en-US' : 'es-PE',
    dateLocale: isEnglish ? enUS : esLocale,
    t: (spanishText: string, englishText: string) => (isEnglish ? englishText : spanishText)
  };
};
