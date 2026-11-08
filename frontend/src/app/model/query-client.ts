import { QueryClient } from '@tanstack/react-query';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      // Tauri commands access the local database and must also run offline.
      queries: {
        networkMode: 'always',
        staleTime: 30_000,
        retry: false,
      },
      mutations: {
        networkMode: 'always',
        retry: false,
      },
    },
  });
