import { useNavigate } from 'react-router';

import { StudyLibrary } from '../../../features/study-library';

const phraseLibrary = {
  kind: 'phrase',
  eyebrow: '—   YOUR EXPRESSIONS',
  headingKey: 'phraseTitle',
  subtitle: 'phraseSubtitle',
  addLabel: 'phraseAdd',
  reviewTitle: 'phrasePracticeTitle',
  reviewBody: 'phrasePracticeBody',
  reviewLabel: 'phraseReview',
  desktopNotice: 'phraseDesktopOnly',
} as const;

export const PhrasePage = () => {
  const navigate = useNavigate();
  return (
    <StudyLibrary
      {...phraseLibrary}
      onReview={() => navigate('/phrases/review')}
      onOpenLibrary={(kind) => navigate(kind === 'phrase' ? '/phrases' : '/')}
    />
  );
};
