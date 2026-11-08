import './styles.scss';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';

import { initI18n } from '@/shared/i18n';

import { VocabularyPage } from '../pages/vocabulary';

import { WorkspaceLayout } from './layout';
import { queryClient } from './query-client';
import { StartupError } from './ui/startup-error';

async function start(): Promise<void> {
  const root = createRoot(document.getElementById('app')!);

  try {
    await initI18n();
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Routes>
              <Route element={<WorkspaceLayout />}>
                <Route index element={<VocabularyPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    );
  } catch {
    root.render(<StartupError />);
  }
}

void start();
