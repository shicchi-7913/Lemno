import type { TopicCategory } from '@/shared/api';

export const categories = ['daily', 'work', 'travel', 'hobby'] as const;
export const difficulties = ['beginner', 'intermediate', 'advanced'] as const;
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
  work: '💻',
  travel: '🧳',
  hobby: '🎧',
};
