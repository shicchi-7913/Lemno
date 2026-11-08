import { invokeForLearningLanguage as invoke } from './invoke';
import type { VocabularyInput } from './vocabulary';

export type TopicCategory = 'daily' | 'work' | 'travel' | 'hobby';
export type TopicDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface TopicInput {
  category: TopicCategory;
  title: string;
  scenario: string;
  learnerRole: string;
  aiRole: string;
  objective: string;
  difficulty: TopicDifficulty;
}

export interface Topic extends TopicInput {
  id: string;
}

export interface Conversation {
  id: string;
  title: string;
  ai: string;
  durationMinutes: number;
  notes: string;
  occurredAt: string;
}

interface Expression {
  id: string;
  text: string;
  kind: 'word' | 'phrase';
}

export interface ConversationDetail extends Conversation {
  usedItems: Expression[];
  learnedItems: Expression[];
}

export interface ConversationInput {
  id: string;
  topicId: string | null;
  ai: string;
  durationMinutes: number;
  notes: string;
  usedItemIds: string[];
  learnedItems: VocabularyInput[];
}

export const conversationApi = {
  topics: () => invoke<Topic[]>('list_topics'),
  saveTopic: (id: string | null, input: TopicInput) => invoke<Topic>('save_topic', { id, input }),
  deleteTopic: (id: string) => invoke<void>('delete_topic', { id }),
  list: () => invoke<Conversation[]>('list_conversations'),
  detail: (id: string) => invoke<ConversationDetail>('get_conversation', { id }),
  record: (input: ConversationInput) =>
    invoke<ConversationDetail>('record_conversation', { input }),
};
