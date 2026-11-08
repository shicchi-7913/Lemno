import { isTauri } from '@tauri-apps/api/core';
import { load } from '@tauri-apps/plugin-store';
import { useSyncExternalStore } from 'react';

export const learningLanguages = [
  { code: 'en', flag: '🇺🇸', title: 'learnEnglish', name: 'targetEnglish' },
  { code: 'ja', flag: '🇯🇵', title: 'learnJapanese', name: 'languageJapanese' },
] as const;

type LearningLanguage = (typeof learningLanguages)[number]['code'];

let settings: Awaited<ReturnType<typeof load>> | undefined;
let snapshot: { language: LearningLanguage; saving: boolean } = { language: 'en', saving: false };
const listeners = new Set<() => void>();

function publish(language: LearningLanguage, saving: boolean) {
  snapshot = { language, saving };
  listeners.forEach((listener) => listener());
}

export async function initLearningLanguage(): Promise<void> {
  let saved: unknown;
  if (isTauri()) {
    settings = await load('learning-language.json', {
      defaults: { language: 'en' },
      autoSave: false,
    });
    saved = await settings.get('language');
  } else {
    saved = localStorage.getItem('lemno.learningLanguage');
  }
  publish(saved === 'ja' ? 'ja' : 'en', false);
}

export const getLearningLanguage = () => snapshot.language;

export async function changeLearningLanguage(language: LearningLanguage): Promise<void> {
  if (snapshot.saving || language === snapshot.language) return;
  const previous = snapshot.language;
  publish(previous, true);
  try {
    if (settings) {
      await settings.set('language', language);
      await settings.save();
    } else {
      localStorage.setItem('lemno.learningLanguage', language);
    }
    publish(language, false);
  } catch (error) {
    publish(previous, false);
    throw error;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const useLearningLanguage = () => useSyncExternalStore(subscribe, () => snapshot);
