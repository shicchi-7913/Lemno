import { type SubmitEvent, useId, useState } from 'react';

import { conversationApi, type ConversationDetail } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { FormLabel } from '@/shared/ui/FormLabel';
import { Heading } from '@/shared/ui/Heading';
import { Label } from '@/shared/ui/Label';
import { useToast } from '@/shared/ui/Toast';

import { useConversationMutation } from '../../../features/conversation-workspace';

import styles from './record.module.scss';

interface Props {
  item: ConversationDetail;
}

const kinds = ['word', 'phrase'] as const;

export const ConversationReview = ({ item }: Props) => {
  const { t } = useI18n();
  const id = useId();
  const notify = useToast();
  const [selected, setSelected] = useState(
    () =>
      new Set(
        item.candidates
          .filter((candidate) => candidate.registered)
          .map((candidate) => candidate.id),
      ),
  );
  const mutation = useConversationMutation((ids: string[]) =>
    conversationApi.saveReview(item.id, ids),
  );
  const saved = !!item.reviewedAt;

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saved || mutation.isPending) return;
    try {
      await mutation.mutateAsync([...selected]);
      notify(t('conversationReviewSaved'));
    } catch {
      // Keep the selected checkboxes available for retry.
    }
  }

  return (
    <form
      className={`${styles.panel} ${styles.review}`}
      onSubmit={submit}
      aria-busy={mutation.isPending}
    >
      <div className={styles.reviewHeading}>
        <Heading as="h2" size="md">
          {t('conversationReflection')}
        </Heading>
        <Label tone={saved ? 'success' : 'warning'}>
          {t(saved ? 'conversationReviewed' : 'conversationUnreviewed')}
        </Label>
      </div>
      <Heading as="h3" size="sm">
        {t('conversationAiFeedback')}
      </Heading>
      <p className={styles.feedback}>{item.feedback || t('conversationNoFeedback')}</p>
      <p className={styles.candidateDescription}>{t('conversationReviewDescription')}</p>
      {kinds.map((kind) => (
        <fieldset
          key={kind}
          className={styles.candidateGroup}
          disabled={saved || mutation.isPending}
        >
          <legend>{t(kind === 'word' ? 'conversationNewWords' : 'conversationNewPhrases')}</legend>
          <ul className={styles.candidateList}>
            {item.candidates
              .filter((candidate) => candidate.kind === kind)
              .map((candidate) => {
                const checked = saved ? candidate.registered : selected.has(candidate.id);
                const fieldId = `${id}-${candidate.id}`;
                return (
                  <li key={candidate.id} className={styles.candidate}>
                    <Checkbox
                      id={fieldId}
                      checked={checked}
                      disabled={candidate.registered}
                      aria-describedby={`${fieldId}-meaning`}
                      onChange={(event) => {
                        const next = new Set(selected);
                        if (event.target.checked) next.add(candidate.id);
                        else next.delete(candidate.id);
                        setSelected(next);
                      }}
                    />
                    <div className={styles.candidateContent}>
                      <div className={styles.candidateHeading}>
                        <FormLabel htmlFor={fieldId}>{candidate.text}</FormLabel>
                        <Label tone={checked ? 'success' : 'neutral'}>
                          {t(checked ? 'conversationRegistered' : 'conversationUnregistered')}
                        </Label>
                      </div>
                      <p id={`${fieldId}-meaning`}>{candidate.explanation}</p>
                      {candidate.exampleText && (
                        <p className={styles.candidateExample}>{candidate.exampleText}</p>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
          {!item.candidates.some((candidate) => candidate.kind === kind) && (
            <p className={styles.candidateDescription}>{t('conversationNoNewExpressions')}</p>
          )}
        </fieldset>
      ))}
      {mutation.isError && <Alert type="error">{t('conversationReviewError')}</Alert>}
      {!saved && (
        <div className={styles.reviewActions}>
          <Button type="submit" disabled={mutation.isPending}>
            {t(mutation.isPending ? 'saving' : 'conversationSaveReview')}
          </Button>
        </div>
      )}
    </form>
  );
};
