import { useSyncExternalStore } from 'react';
import i18next from 'i18next';
import { currentLocale, t } from './i18n';

function subscribe(onChange: () => void): () => void {
  i18next.on('languageChanged', onChange);
  return () => {
    i18next.off('languageChanged', onChange);
  };
}

export function useI18n() {
  const locale = useSyncExternalStore(subscribe, currentLocale);
  return { t, locale };
}
