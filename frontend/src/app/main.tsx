import styles from './main.module.scss';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { VocabularyPage } from '../features/vocabulary';
import { initI18n, startupErrorMessage } from '../shared/i18n';
import { queryClient } from './query-client';
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
              <Route path="/" element={<VocabularyPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    );
  } catch {
    root.render(
      <p className={styles.startupError}>
        {/* Use bundled messages even when i18next initialization fails. */}
        {startupErrorMessage}
      </p>,
    );
  }
}

void start();
