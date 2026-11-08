import './styles.scss';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';

import { initI18n } from '@/shared/i18n';
import { initLearningLanguage } from '@/shared/learning-language';

import { ConversationHistoryPage } from '../pages/conversation-history';
import { ConversationRecordPage } from '../pages/conversation-record';
import { ConversationRecorderPage } from '../pages/conversation-recorder';
import { HomePage } from '../pages/home';
import { PhraseReviewPage } from '../pages/phrase-review';
import { PhrasePage } from '../pages/phrases';
import { ProfilesPage } from '../pages/profiles';
import { TopicsPage } from '../pages/topics';
import { VocabularyPage } from '../pages/vocabulary';
import { VocabularyReviewPage } from '../pages/vocabulary-review';

import { StartupError } from './ui/startup-error';
import { Workspace } from './ui/workspace';

async function start(): Promise<void> {
  const root = createRoot(document.getElementById('app')!);

  try {
    await Promise.all([initI18n(), initLearningLanguage()]);
    root.render(
      <StrictMode>
        <MemoryRouter>
          <Routes>
            <Route element={<Workspace />}>
              <Route index element={<HomePage />} />
              <Route path="vocabulary" element={<VocabularyPage />} />
              <Route path="topics" element={<TopicsPage />} />
              <Route path="topics/history" element={<ConversationHistoryPage />} />
              <Route path="conversations/new" element={<ConversationRecorderPage />} />
              <Route path="conversations/:id" element={<ConversationRecordPage />} />
              <Route path="phrases" element={<PhrasePage />} />
              <Route path="phrases/review" element={<PhraseReviewPage />} />
              <Route path="vocabulary/review" element={<VocabularyReviewPage />} />
              <Route path="profiles" element={<ProfilesPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );
  } catch {
    root.render(<StartupError />);
  }
}

void start();
