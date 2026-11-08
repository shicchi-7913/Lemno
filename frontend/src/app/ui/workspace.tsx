import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useLearningLanguage } from '@/shared/learning-language';

import { WorkspaceLayout } from '../layout';
import { createQueryClient } from '../model/query-client';

export const Workspace = () => {
  const { language } = useLearningLanguage();
  // A separate cache prevents in-flight work for one language from populating another.
  const client = useMemo(() => createQueryClient(), [language]);

  return (
    <QueryClientProvider client={client}>
      <WorkspaceLayout />
    </QueryClientProvider>
  );
};
