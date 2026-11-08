import { useNavigate } from 'react-router';

import { StudyReview } from '../../../features/review-study-items';

export const VocabularyReviewPage = () => {
  const navigate = useNavigate();
  return (
    <StudyReview
      kind="word"
      headingKey="wordReviewHeading"
      introduction="reviewIntroWords"
      backLabel="backToVocabulary"
      onBack={() => navigate('/')}
    />
  );
};
