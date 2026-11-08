import type { TopicCategory } from '@/shared/api';

export const categoryKeys = {
  daily: 'topicDaily',
  work: 'topicWork',
  travel: 'topicTravel',
  hobby: 'topicHobby',
} as const;
export const difficultyKeys = {
  beginner: 'topicBeginner',
  intermediate: 'topicIntermediate',
  advanced: 'topicAdvanced',
} as const;
export const categoryEmoji: Record<TopicCategory, string> = {
  daily: '☕',
  work: '\u{1F4BB}',
  travel: '🧳',
  hobby: '🎧',
};
