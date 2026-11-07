import { invoke, isTauri } from '@tauri-apps/api/core';

export interface Vocabulary {
  id: string;
  profileId: string;
  text: string;
  explanation: string;
  exampleText: string;
  memoryLevel: number;
  reviewCount: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type VocabularyInput = Pick<Vocabulary, 'text' | 'explanation' | 'exampleText'>;

export const desktopAvailable = isTauri();

export const vocabularyApi = {
  list: () => invoke<Vocabulary[]>('list_vocabulary'),
  create: (input: VocabularyInput) => invoke<Vocabulary>('create_vocabulary', { input }),
  update: (id: string, input: VocabularyInput) =>
    invoke<Vocabulary>('update_vocabulary', { id, input }),
  delete: (id: string) => invoke<void>('delete_vocabulary', { id }),
};

export function errorCode(error: unknown): 'validation' | 'notFound' | 'storage' {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    if (code === 'validation' || code === 'notFound') return code;
  }
  return 'storage';
}
