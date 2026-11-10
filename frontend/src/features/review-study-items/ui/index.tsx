import { useEffect, useRef, useState } from 'react';

import { desktopAvailable, type StudyKind, type Vocabulary } from '@/shared/api';
import { type t, useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { ButtonBase } from '@/shared/ui/ButtonBase';
import { Heading } from '@/shared/ui/Heading';
import { HeadingGroup } from '@/shared/ui/HeadingGroup';
import { Icon } from '@/shared/ui/Icon';
import { Spinner } from '@/shared/ui/Spinner';
import { Surface } from '@/shared/ui/Surface';

import { useVocabulary, useVocabularyReview } from '../../manage-vocabulary';

import { GoalPanel } from './goal-panel';

import styles from './review.module.scss';

interface ReviewSession {
  queue: Vocabulary[];
  index: number;
  reviewed: number;
}

interface StudyReviewProps {
  kind: StudyKind;
  headingKey: Parameters<typeof t>[0];
  introduction: Parameters<typeof t>[0];
  backLabel: Parameters<typeof t>[0];
  onBack: () => void;
}

export const StudyReview = ({
  kind,
  headingKey,
  introduction,
  backLabel,
  onBack,
}: StudyReviewProps) => {
  const { t } = useI18n();
  const phrase = kind === 'phrase';
  const vocabulary = useVocabulary(kind);
  const mutation = useVocabularyReview(kind);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [revealed, setRevealed] = useState(false);
  const submitting = useRef(false);
  const cardRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (vocabulary.data && !session) {
      setSession({ queue: [...vocabulary.data], index: 0, reviewed: 0 });
    }
  }, [vocabulary.data, session]);

  const card = session?.queue[session.index];
  const finished = !!session?.queue.length && !card;
  const loading = vocabulary.isLoading || (desktopAvailable && !vocabulary.isError && !session);
  const failed = vocabulary.isError && !vocabulary.data;
  const reviewedToday = (vocabulary.data ?? []).reduce((sum, item) => sum + item.reviewedToday, 0);

  async function rate(remembered: boolean) {
    if (!card || submitting.current) return;
    submitting.current = true;
    try {
      const updated = await mutation.mutateAsync({ id: card.id, remembered });
      setSession(
        (previous) =>
          previous && {
            queue: remembered ? previous.queue : [...previous.queue, updated],
            index: previous.index + 1,
            reviewed: previous.reviewed + 1,
          },
      );
      setRevealed(false);
      requestAnimationFrame(() => cardRef.current?.focus());
    } catch {
      // Keep this card and its revealed state so the same answer can be retried.
    } finally {
      submitting.current = false;
    }
  }

  return (
    <>
      <Button
        className={styles.backButton}
        variant="ghost"
        tone="neutral"
        size="xs"
        type="button"
        onClick={onBack}
        leftIcon={
          <span className={styles.backChevron}>
            <Icon name="chevron" size={14} />
          </span>
        }
      >
        {t(backLabel)}
      </Button>
      <HeadingGroup
        as="h1"
        className={styles.pageHeading}
        title={t(headingKey)}
        description={t(introduction)}
        descriptionSize="sm"
      />
      <div className={styles.reviewLayout}>
        <Surface
          as="section"
          className={styles.reviewPanel}
          aria-label={t('flashcards')}
          aria-busy={loading || mutation.isPending}
        >
          <div className={styles.cardToolbar}>
            <span>
              <Icon name="brain" size={18} />
              {t('flashcards')}
            </span>
            {session && card && (
              <span
                aria-label={t('reviewProgress', {
                  current: session.index + 1,
                  total: session.queue.length,
                })}
              >
                {session.index + 1} / {session.queue.length}
              </span>
            )}
          </div>
          <progress
            className={styles.progress}
            value={
              session?.queue.length ? (finished ? session.queue.length : session.index + 1) : 0
            }
            max={session?.queue.length || 1}
            aria-label={t('flashcards')}
          />
          {loading ? (
            <div className={styles.messageState}>
              <Spinner />
              <p role="status">{t(phrase ? 'phraseLoading' : 'loading')}</p>
            </div>
          ) : failed ? (
            <div className={styles.messageState}>
              <p role="alert">{t(phrase ? 'phraseLoadError' : 'loadError')}</p>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  void vocabulary.refetch();
                }}
              >
                {t('retry')}
              </Button>
            </div>
          ) : card ? (
            <>
              <ButtonBase
                ref={cardRef}
                type="button"
                className={styles.flashcard}
                aria-label={`${revealed ? card.explanation : card.text}. ${t(revealed ? 'hideHint' : 'revealHint')}`}
                aria-describedby={revealed && card.exampleText ? 'review-example' : undefined}
                aria-pressed={revealed}
                disabled={mutation.isPending}
                onClick={() => setRevealed((previous) => !previous)}
              >
                <strong className={styles.cardText}>
                  {revealed ? card.explanation : card.text}
                </strong>
                {revealed && card.exampleText && (
                  <span id="review-example" className={styles.cardExample}>
                    {card.exampleText}
                  </span>
                )}
                <span className={styles.cardHint}>{t(revealed ? 'hideHint' : 'revealHint')}</span>
                <span className={styles.watermark}>
                  <Icon name="sun" size={200} />
                </span>
              </ButtonBase>
              <div className={styles.ratingActions}>
                <Button
                  className={styles.againButton}
                  variant="outline"
                  tone="warning"
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => {
                    void rate(false);
                  }}
                  leftIcon={<Icon name="undo" size={16} />}
                >
                  {t('again')}
                </Button>
                <Button
                  variant="solid"
                  tone="brand"
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => {
                    void rate(true);
                  }}
                  leftIcon={<Icon name="check" size={16} />}
                >
                  {t('remembered')}
                </Button>
              </div>
            </>
          ) : finished ? (
            <div className={styles.messageState}>
              <span className={styles.completeSymbol}>
                <Icon name="check" size={30} />
              </span>
              <Heading as="h2">{t('reviewComplete')}</Heading>
              <p role="status">{t('reviewCompleteBody', { count: session.reviewed })}</p>
              <div className={styles.ratingActions}>
                <Button variant="outline" tone="neutral" type="button" onClick={onBack}>
                  {t(backLabel)}
                </Button>
                <Button
                  variant="solid"
                  type="button"
                  onClick={() => {
                    setSession(null);
                    setRevealed(false);
                    mutation.reset();
                  }}
                >
                  {t('reviewRestart')}
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.messageState}>
              <Icon name="layers" size={32} />
              <Heading as="h2">{t('reviewEmpty')}</Heading>
              <p>
                {t(
                  desktopAvailable
                    ? 'reviewEmptyBody'
                    : phrase
                      ? 'phraseDesktopOnly'
                      : 'desktopOnly',
                )}
              </p>
              <Button type="button" onClick={onBack}>
                {t(backLabel)}
              </Button>
            </div>
          )}
          {mutation.isError && (
            <p className={styles.error} role="alert">
              {t('reviewSaveError')}
            </p>
          )}
          <p className={styles.separationNote}>{t('reviewSeparationNote')}</p>
        </Surface>
        <GoalPanel reviewed={reviewedToday} />
      </div>
    </>
  );
};
