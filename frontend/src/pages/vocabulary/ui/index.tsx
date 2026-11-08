import { useNavigate } from 'react-router';

import { StudyLibrary } from '../../../features/study-library';

const vocabularyLibrary = {
  kind: 'word',
  headingKey: 'title',
  subtitle: 'subtitle',
  addLabel: 'add',
  reviewTitle: 'reviewTitle',
  reviewBody: 'reviewBody',
  reviewLabel: 'review',
  desktopNotice: 'desktopOnly',
} as const;

export const VocabularyPage = () => {
  const navigate = useNavigate();
  return (
    <StudyLibrary
      {...vocabularyLibrary}
      onReview={() => navigate('/vocabulary/review')}
      onOpenLibrary={(kind) => navigate(kind === 'phrase' ? '/phrases' : '/')}
    />
  );
};
