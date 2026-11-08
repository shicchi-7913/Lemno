import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { conversationApi, desktopAvailable } from '@/shared/api';

export const useTopics = () =>
  useQuery({
    queryKey: ['topics'],
    queryFn: conversationApi.topics,
    enabled: desktopAvailable,
  });

export function useConversationMutation<T, V>(mutationFn: (variables: V) => Promise<T>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['topics'] }),
        client.invalidateQueries({ queryKey: ['conversations'] }),
        client.invalidateQueries({ queryKey: ['vocabulary'] }),
      ]);
    },
  });
}

export function conversationDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
