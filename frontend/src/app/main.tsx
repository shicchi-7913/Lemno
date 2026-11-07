import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { VocabularyPage } from '../features/vocabulary';
import { initI18n } from '../shared/i18n';
import { queryClient } from './query-client';
import { WorkspaceLayout } from './layout';
import { StartupError } from './ui/startup-error';
import './styles.scss';

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
