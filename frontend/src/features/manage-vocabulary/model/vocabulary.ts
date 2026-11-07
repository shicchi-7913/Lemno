import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  desktopAvailable,
  vocabularyApi,
  type Vocabulary,
  type VocabularyInput,
} from '../../../shared/api';

const vocabularyListOptions = queryOptions({
  queryKey: ['vocabulary'],
  queryFn: vocabularyApi.list,
  enabled: desktopAvailable,
});

export type VocabularyDialogState =
  { mode: 'create' } | { mode: 'edit' | 'delete'; item: Vocabulary };

export type VocabularyChange =
  { kind: 'saved'; item: Vocabulary; created: boolean } | { kind: 'deleted'; id: string };

type VocabularyMutationInput =
  | { mode: 'create'; input: VocabularyInput }
  | { mode: 'edit'; id: string; input: VocabularyInput }
  | { mode: 'delete'; id: string };

export function useVocabulary() {
  return useQuery(vocabularyListOptions);
}

async function mutateVocabulary(action: VocabularyMutationInput): Promise<VocabularyChange> {
  if (action.mode === 'delete') {
    await vocabularyApi.delete(action.id);
    return { kind: 'deleted', id: action.id };
  }

  const item =
    action.mode === 'edit'
      ? await vocabularyApi.update(action.id, action.input)
      : await vocabularyApi.create(action.input);
  return { kind: 'saved', item, created: action.mode === 'create' };
}

export function useVocabularyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mutateVocabulary,
    onSuccess: async (change) => {
      const queryKey = vocabularyListOptions.queryKey;
      // Prevent an older in-flight read from overwriting the saved result.
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, (previous) => {
        // Do not seed an incomplete list if no list has been fetched yet.
        if (!previous) return previous;
        if (change.kind === 'deleted') return previous.filter((item) => item.id !== change.id);
        if (change.created)
          return [change.item, ...previous.filter((item) => item.id !== change.item.id)];
        return previous.map((item) => (item.id === change.item.id ? change.item : item));
      });
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}
