import type { Vocabulary } from '@/shared/api';

export const statuses = ['all', 'learning', 'consolidating', 'mastered'] as const;
export type Status = (typeof statuses)[number];

// Memory bands are independent of conversation usage.
export function memoryStatus(item: Vocabulary): Exclude<Status, 'all'> {
  return item.memoryLevel >= 2 ? 'mastered' : item.memoryLevel === 1 ? 'consolidating' : 'learning';
}

export function filterStudyItems(items: Vocabulary[], query: string, status: Status): Vocabulary[] {
  const normalized = query.normalize('NFKC').trim().toLocaleLowerCase();
  return items.filter(
    (item) =>
      (status === 'all' || memoryStatus(item) === status) &&
      `${item.text}\n${item.explanation}`
        .normalize('NFKC')
        .toLocaleLowerCase()
        .includes(normalized),
  );
}
