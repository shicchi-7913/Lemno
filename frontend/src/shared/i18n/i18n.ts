import { load } from '@tauri-apps/plugin-store';
import i18next from 'i18next';

import { desktopAvailable } from '../api';

import en from './locales/en.json';
import ja from './locales/ja.json';

let settings: Awaited<ReturnType<typeof load>> | undefined;

export async function initI18n(): Promise<void> {
  let locale = 'ja';
  if (desktopAvailable) {
    settings = await load('settings.json', { defaults: { locale: 'ja' }, autoSave: false });
    const saved = await settings.get<string>('locale');
    if (saved === 'en' || saved === 'ja') locale = saved;
  }
  await i18next.init({
    lng: locale,
    fallbackLng: 'ja',
    resources: { ja: { translation: ja }, en: { translation: en } },
    interpolation: { escapeValue: false },
  });
  document.documentElement.lang = locale;
}

export async function changeLocale(locale: string): Promise<void> {
  if (locale !== 'en' && locale !== 'ja') return;
  if (settings) {
    await settings.set('locale', locale);
    await settings.save();
  }
  await i18next.changeLanguage(locale);
  document.documentElement.lang = locale;
}

export const t = (key: keyof typeof ja, options?: Record<string, string | number>) =>
  String(i18next.t(key, options));
export const currentLocale = () => i18next.language;

export const startupErrorMessage = `${ja.startupError} / ${en.startupError}`;
