import { conversationApi, type ConversationDetail } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Label } from '@/shared/ui/Label';

import { useConversationMutation } from '../../../features/conversation-workspace';

import styles from './record.module.scss';

interface Props {
  id: string;
  items: ConversationDetail['pendingItems'];
}

export const LearningCandidates = ({ id, items }: Props) => {
  const { t } = useI18n();
  const mutation = useConversationMutation(
    ({ candidateId, register }: { candidateId: string; register: boolean }) =>
      conversationApi.resolveCandidate(id, candidateId, register),
  );

  return (
    <section className={`${styles.panel} ${styles.candidates}`} aria-busy={mutation.isPending}>
      <Heading as="h2" size="md">
        {t('conversationCandidatesTitle')}
      </Heading>
      <p className={styles.candidateDescription}>{t('conversationCandidatesDescription')}</p>
      {mutation.isError && <Alert type="error">{t('conversationCandidateError')}</Alert>}
      <ul className={styles.candidateList}>
        {items.map((item) => (
          <li key={item.id} className={styles.candidate}>
            <div className={styles.candidateContent}>
              <div className={styles.candidateHeading}>
                <Heading as="h3" size="sm">
                  {item.text}
                </Heading>
                <Label>
                  {t(
                    item.kind === 'word'
                      ? 'conversationCandidateWord'
                      : 'conversationCandidatePhrase',
                  )}
                </Label>
              </div>
              <p>{item.explanation}</p>
              {item.exampleText && <p className={styles.candidateExample}>{item.exampleText}</p>}
            </div>
            <div className={styles.candidateActions}>
              <Button
                variant="outline"
                tone="neutral"
                disabled={mutation.isPending}
                aria-label={t('conversationCandidateSkipLabel', { text: item.text })}
                onClick={() => mutation.mutate({ candidateId: item.id, register: false })}
              >
                {t('conversationCandidateSkip')}
              </Button>
              <Button
                disabled={mutation.isPending}
                aria-label={t('conversationCandidateRegisterLabel', { text: item.text })}
                onClick={() => mutation.mutate({ candidateId: item.id, register: true })}
              >
                {t('conversationCandidateRegister')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
