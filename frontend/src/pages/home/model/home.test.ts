import { describe, expect, it } from 'vitest';

import type { Conversation, Vocabulary } from '@/shared/api';

import { conversationActivity, practiceCandidates } from './index';

const localDate = (day: number, hour = 12) => new Date(2026, 10, day, hour);
const conversation = (day: number, hour?: number): Conversation => ({
  id: `${day}-${hour ?? 12}`,
  title: '',
  ai: 'ChatGPT',
  durationMinutes: 10,
  notes: '',
  occurredAt: localDate(day, hour).toISOString(),
});

describe('conversationActivity', () => {
  it('counts each practice day once for a streak and each conversation in the heatmap', () => {
    const result = conversationActivity(
      [conversation(6), conversation(7), conversation(8, 9), conversation(8, 10)],
      localDate(8),
    );
    expect(result.streak).toBe(3);
    expect(result.days).toHaveLength(28);
    expect(result.days[27].count).toBe(2);
    expect(result.days[0].date.getTime()).toBe(localDate(-19, 0).getTime());
  });

  it('keeps yesterday’s streak active but resets after a missed day', () => {
    expect(conversationActivity([conversation(6), conversation(7)], localDate(8)).streak).toBe(2);
    expect(conversationActivity([conversation(6)], localDate(8)).streak).toBe(0);
    expect(conversationActivity([], localDate(8)).streak).toBe(0);
  });

  it('uses local calendar boundaries, including a month change', () => {
    const now = new Date(2026, 10, 1, 0, 30);
    const result = conversationActivity([conversation(0, 23), conversation(1, 0)], now);
    expect(result.streak).toBe(2);
    expect(result.days[26].count).toBe(1);
    expect(result.days[27].count).toBe(1);
  });

  it('ignores invalid and future timestamps', () => {
    const result = conversationActivity(
      [{ ...conversation(8), occurredAt: 'invalid' }, conversation(9), conversation(8, 13)],
      localDate(8),
    );
    expect(result.streak).toBe(0);
    expect(result.days.every((day) => day.count === 0)).toBe(true);
  });
});

describe('practiceCandidates', () => {
  it('prioritizes unused expressions and then memory level and review count', () => {
    const item = (
      id: string,
      usageCount: number,
      memoryLevel: number,
      reviewCount: number,
    ): Vocabulary => ({
      id,
      kind: 'word',
      profileId: 'default-en',
      text: id,
      explanation: '',
      exampleText: '',
      reviewedToday: 0,
      createdAt: localDate(1).toISOString(),
      updatedAt: localDate(1).toISOString(),
      usageCount,
      memoryLevel,
      reviewCount,
    });
    const items = Object.freeze([
      item('used', 1, 0, 0),
      item('remembering', 0, 1, 0),
      item('reviewed', 0, 0, 2),
      item('new', 0, 0, 0),
    ]);
    expect(practiceCandidates(items).map((entry) => entry.id)).toEqual([
      'new',
      'reviewed',
      'remembering',
    ]);
    expect(items[0].id).toBe('used');
    expect(practiceCandidates([])).toEqual([]);
  });
});
