import { invoke } from '@tauri-apps/api/core';

import { getLearningLanguage } from '../learning-language';

export const invokeForLearningLanguage = <T>(command: string, args: Record<string, unknown> = {}) =>
  invoke<T>(command, { ...args, profileId: `default-${getLearningLanguage()}` });
