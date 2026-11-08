import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { conversationActivity, practiceCandidates } from './index.ts';

const localDate = (day, hour = 12) => new Date(2026, 10, day, hour);
const conversation = (day, hour) => ({ occurredAt: localDate(day, hour).toISOString() });

describe('conversationActivity', () => {
  it('counts each practice day once for a streak and each conversation in the heatmap', () => {
    const result = conversationActivity(
      [conversation(6), conversation(7), conversation(8, 9), conversation(8, 10)],
      localDate(8),
    );
    assert.equal(result.streak, 3);
    assert.equal(result.days.length, 28);
    assert.equal(result.days[27].count, 2);
    assert.equal(result.days[0].date.getTime(), localDate(-19, 0).getTime());
  });

  it('keeps yesterday’s streak active but resets after a missed day', () => {
    assert.equal(conversationActivity([conversation(6), conversation(7)], localDate(8)).streak, 2);
    assert.equal(conversationActivity([conversation(6)], localDate(8)).streak, 0);
    assert.equal(conversationActivity([], localDate(8)).streak, 0);
  });

  it('uses local calendar boundaries, including a month change', () => {
    const now = new Date(2026, 10, 1, 0, 30);
    const result = conversationActivity([conversation(0, 23), conversation(1, 0)], now);
    assert.equal(result.streak, 2);
    assert.equal(result.days[26].count, 1);
    assert.equal(result.days[27].count, 1);
  });

  it('ignores invalid and future timestamps', () => {
    const result = conversationActivity(
      [{ occurredAt: 'invalid' }, conversation(9), conversation(8, 13)],
      localDate(8),
    );
    assert.equal(result.streak, 0);
    assert.ok(result.days.every((day) => day.count === 0));
  });
});

describe('practiceCandidates', () => {
  it('prioritizes unused expressions and then memory level and review count', () => {
    const item = (id, usageCount, memoryLevel, reviewCount) => ({
      id,
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
    assert.deepEqual(
      practiceCandidates(items).map((entry) => entry.id),
      ['new', 'reviewed', 'remembering'],
    );
    assert.equal(items[0].id, 'used');
    assert.deepEqual(practiceCandidates([]), []);
  });
});
