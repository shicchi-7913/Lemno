import type { Vocabulary } from '@/shared/api';

export const statuses = ['all', 'learning', 'consolidating', 'mastered'] as const;
export type Status = (typeof statuses)[number];

// Temporary display bands, independent of conversation usage. Review scheduling is a later feature.
export function memoryStatus(item: Vocabulary): Exclude<Status, 'all'> {
  return item.memoryLevel >= 2 ? 'mastered' : item.memoryLevel === 1 ? 'consolidating' : 'learning';
}

export function filterVocabulary(items: Vocabulary[], query: string, status: Status): Vocabulary[] {
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
