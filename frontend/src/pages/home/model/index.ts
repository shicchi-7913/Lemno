import type { Conversation, Vocabulary } from '@/shared/api';

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function offsetDay(date: Date, offset: number): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + offset);
  return result;
}

export function conversationActivity(items: Conversation[], now: Date) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const date = new Date(item.occurredAt);
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const key = dayKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Yesterday's streak remains active until the learner has a chance to practice today.
  let offset = counts.has(dayKey(now)) ? 0 : -1;
  let streak = 0;
  while (counts.has(dayKey(offsetDay(now, offset)))) {
    streak += 1;
    offset -= 1;
  }

  const days = Array.from({ length: 28 }, (_, index) => {
    const date = offsetDay(now, index - 27);
    return { date, count: counts.get(dayKey(date)) ?? 0 };
  });
  return { streak, days };
}

export function practiceCandidates(items: Vocabulary[]): Vocabulary[] {
  return items
    .slice()
    .sort(
      (a, b) =>
        a.usageCount - b.usageCount ||
        a.memoryLevel - b.memoryLevel ||
        a.reviewCount - b.reviewCount ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 3);
}
