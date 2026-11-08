import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { filterStudyItems, memoryStatus } from './study-items.ts';

const items = [
  { id: '1', text: 'Apple', explanation: 'りんご', memoryLevel: 0 },
  { id: '2', text: 'Banana', explanation: '黄色い果物', memoryLevel: 1 },
  { id: '3', text: 'ＡＰＰＬＥ pie', explanation: '焼き菓子', memoryLevel: 2 },
  { id: '4', text: 'Coffee', explanation: 'コーヒー', memoryLevel: 3 },
];

describe('memoryStatus', () => {
  it('groups vocabulary into the three learning stages', () => {
    assert.deepEqual(items.map(memoryStatus), [
      'learning',
      'consolidating',
      'mastered',
      'mastered',
    ]);
  });
});

describe('filterStudyItems', () => {
  it('returns all items in their original order for a blank query', () => {
    assert.deepEqual(filterStudyItems(items, '　 ', 'all'), items);
  });

  it('matches text regardless of case, width, and surrounding whitespace', () => {
    assert.deepEqual(filterStudyItems(items, '  ａｐｐｌｅ　', 'all'), [items[0], items[2]]);
  });

  it('searches explanations and normalizes half-width kana', () => {
    assert.deepEqual(filterStudyItems(items, 'ｺｰﾋｰ', 'all'), [items[3]]);
  });

  it('filters each learning stage', () => {
    assert.deepEqual(filterStudyItems(items, '', 'learning'), [items[0]]);
    assert.deepEqual(filterStudyItems(items, '', 'consolidating'), [items[1]]);
    assert.deepEqual(filterStudyItems(items, '', 'mastered'), [items[2], items[3]]);
  });

  it('requires both the query and learning stage to match', () => {
    assert.deepEqual(filterStudyItems(items, 'apple', 'mastered'), [items[2]]);
    assert.deepEqual(filterStudyItems(items, 'apple', 'consolidating'), []);
  });

  it('returns no items for an unmatched query or empty list', () => {
    assert.deepEqual(filterStudyItems(items, 'orange', 'all'), []);
    assert.deepEqual(filterStudyItems([], 'apple', 'all'), []);
  });

  it('leaves the input array and vocabulary unchanged', () => {
    const frozenItems = Object.freeze(items.map((item) => Object.freeze({ ...item })));

    assert.deepEqual(filterStudyItems(frozenItems, 'apple', 'mastered'), [items[2]]);
    assert.deepEqual(frozenItems, items);
  });
});
