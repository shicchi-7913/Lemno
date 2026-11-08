import { useNavigate } from 'react-router';

import { StudyReview } from '../../../features/review-study-items';

export const PhraseReviewPage = () => {
  const navigate = useNavigate();
  return (
    <StudyReview
      kind="phrase"
      headingKey="phraseReviewHeading"
      introduction="reviewIntroPhrases"
      backLabel="backToPhrases"
      onBack={() => navigate('/phrases')}
    />
  );
};
