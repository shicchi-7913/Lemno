import { describe, expect, it } from 'vitest';

import type { Vocabulary } from '@/shared/api';

import { filterStudyItems, memoryStatus } from './study-items';

const vocabulary = (
  input: Pick<Vocabulary, 'id' | 'text' | 'explanation' | 'memoryLevel'>,
): Vocabulary => ({
  kind: 'word',
  profileId: 'default-en',
  exampleText: '',
  reviewCount: 0,
  reviewedToday: 0,
  usageCount: 0,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...input,
});

const items = [
  vocabulary({ id: '1', text: 'Apple', explanation: 'りんご', memoryLevel: 0 }),
  vocabulary({ id: '2', text: 'Banana', explanation: '黄色い果物', memoryLevel: 1 }),
  vocabulary({ id: '3', text: 'ＡＰＰＬＥ pie', explanation: '焼き菓子', memoryLevel: 2 }),
  vocabulary({ id: '4', text: 'Coffee', explanation: 'コーヒー', memoryLevel: 3 }),
];

describe('memoryStatus', () => {
  it('groups vocabulary into the three learning stages', () => {
    expect(items.map(memoryStatus)).toEqual(['learning', 'consolidating', 'mastered', 'mastered']);
  });
});

describe('filterStudyItems', () => {
  it('returns all items in their original order for a blank query', () => {
    expect(filterStudyItems(items, '　 ', 'all')).toEqual(items);
  });

  it('matches text regardless of case, width, and surrounding whitespace', () => {
    expect(filterStudyItems(items, '  ａｐｐｌｅ　', 'all')).toEqual([items[0], items[2]]);
  });

  it('searches explanations and normalizes half-width kana', () => {
    expect(filterStudyItems(items, 'ｺｰﾋｰ', 'all')).toEqual([items[3]]);
  });

  it('filters each learning stage', () => {
    expect(filterStudyItems(items, '', 'learning')).toEqual([items[0]]);
    expect(filterStudyItems(items, '', 'consolidating')).toEqual([items[1]]);
    expect(filterStudyItems(items, '', 'mastered')).toEqual([items[2], items[3]]);
  });

  it('requires both the query and learning stage to match', () => {
    expect(filterStudyItems(items, 'apple', 'mastered')).toEqual([items[2]]);
    expect(filterStudyItems(items, 'apple', 'consolidating')).toEqual([]);
  });

  it('returns no items for an unmatched query or empty list', () => {
    expect(filterStudyItems(items, 'orange', 'all')).toEqual([]);
    expect(filterStudyItems([], 'apple', 'all')).toEqual([]);
  });

  it('leaves the input array and vocabulary unchanged', () => {
    const frozenItems = Object.freeze(items.map((item) => Object.freeze({ ...item })));

    expect(filterStudyItems(frozenItems, 'apple', 'mastered')).toEqual([items[2]]);
    expect(frozenItems).toEqual(items);
  });
});
