import { isTauri } from '@tauri-apps/api/core';

import { invokeForLearningLanguage as invoke } from './invoke';

export type StudyKind = 'word' | 'phrase';

export interface Vocabulary {
  kind: StudyKind;
  id: string;
  profileId: string;
  text: string;
  explanation: string;
  exampleText: string;
  memoryLevel: number;
  reviewCount: number;
  reviewedToday: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type VocabularyInput = Pick<Vocabulary, 'kind' | 'text' | 'explanation' | 'exampleText'>;

export const desktopAvailable = isTauri();

export const vocabularyApi = {
  list: (kind: StudyKind) => invoke<Vocabulary[]>('list_vocabulary', { kind }),
  create: (input: VocabularyInput) => invoke<Vocabulary>('create_vocabulary', { input }),
  update: (id: string, input: VocabularyInput) =>
    invoke<Vocabulary>('update_vocabulary', { id, input }),
  delete: (id: string, kind: StudyKind) => invoke<void>('delete_vocabulary', { id, kind }),
  review: (id: string, kind: StudyKind, remembered: boolean) =>
    invoke<Vocabulary>('review_vocabulary', { id, kind, remembered }),
};

export function errorCode(error: unknown): 'validation' | 'notFound' | 'storage' {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    if (code === 'validation' || code === 'notFound') return code;
  }
  return 'storage';
}
