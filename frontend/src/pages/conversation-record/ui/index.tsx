import { useQueries, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';

import { conversationApi, desktopAvailable, vocabularyApi } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';

import { conversationDate } from '../../../features/conversation-workspace';

import { ConversationReview } from './conversation-review';

import styles from './record.module.scss';

export const ConversationRecordPage = () => {
  const { t, locale } = useI18n();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const record = useQuery({
    queryKey: ['conversations', id],
    queryFn: () => conversationApi.detail(id),
    enabled: desktopAvailable && !!id,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
  const item = record.data;
  const vocabulary = useQueries({
    queries: (['word', 'phrase'] as const).map((kind) => ({
      queryKey: ['vocabulary', kind],
      queryFn: () => vocabularyApi.list(kind),
      enabled: desktopAvailable,
      refetchOnMount: 'always' as const,
      refetchOnWindowFocus: 'always' as const,
    })),
  });
  const usageCounts = new Map(
    vocabulary.flatMap((query) => query.data ?? []).map((entry) => [entry.id, entry.usageCount]),
  );
  return (
    <div className={styles.contained}>
      <Button
        className={styles.backButton}
        variant="ghost"
        tone="neutral"
        leftIcon={<Icon name="back" size={15} />}
        onClick={() => navigate('/topics/history')}
      >
        {t('conversationBack')}
      </Button>
      {!desktopAvailable ? (
        <p className={styles.notice}>{t('conversationDesktopOnly')}</p>
      ) : record.isLoading ? (
        <p className={styles.empty}>{t('conversationLoading')}</p>
      ) : record.isError || !item ? (
        <div className={styles.empty} role="alert">
          <p>{t('conversationRecordNotFound')}</p>
          <Button variant="outline" onClick={() => void record.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : (
        <>
          <section className={styles.pageHeading}>
            <div>
              <Heading as="h1">{item.title || t('conversationUntitled')}</Heading>
              <p>
                {conversationDate(item.occurredAt, locale)} · {item.ai} ·{' '}
                {t('conversationMinutes', { count: item.durationMinutes })}
              </p>
            </div>
          </section>
          <div className={styles.detailGrid}>
            <section className={`${styles.panel} ${styles.notesPanel}`}>
              <Heading as="h2" size="md" className={styles.sectionHeading}>
                {t('conversationSummary')}
              </Heading>
              <p className={styles.noteContent}>{item.notes}</p>
              <div className={styles.badges}>
                <span>{item.ai}</span>
                <span>{t('conversationPracticeMinutes', { count: item.durationMinutes })}</span>
              </div>
            </section>
            <section className={`${styles.panel} ${styles.expressionsPanel}`}>
              <Heading as="h2" size="md" className={styles.sectionHeading}>
                {t('conversationUsedExpressions')}
              </Heading>
              {item.usedItems.length ? (
                item.usedItems.map((expression) => (
                  <Link
                    key={expression.id}
                    to={expression.kind === 'word' ? '/vocabulary' : '/phrases'}
                    className={styles.usedExpression}
                  >
                    <Icon name="check" size={16} />
                    {expression.text}
                    {usageCounts.has(expression.id) && (
                      <span className={styles.usageCount}>
                        {t('conversationUsageCount', { count: usageCounts.get(expression.id)! })}
                      </span>
                    )}
                  </Link>
                ))
              ) : (
                <p className={styles.muted}>{t('conversationNoExpressions')}</p>
              )}
              {item.learnedItems.length > 0 && (
                <Heading as="h2" size="md" className={styles.sectionHeading}>
                  {t('conversationLearnedExpressions')}
                </Heading>
              )}
              {item.learnedItems.map((expression) => (
                <Link
                  key={expression.id}
                  to={expression.kind === 'word' ? '/vocabulary' : '/phrases'}
                  className={styles.learnedExpression}
                >
                  <Icon name="book" size={16} />
                  {expression.text}
                </Link>
              ))}
              <Button
                className={styles.fullWidth}
                variant="outline"
                onClick={() => navigate('/vocabulary')}
                rightIcon={<Icon name="arrow" size={16} />}
              >
                {t('conversationReviewVocabulary')}
              </Button>
            </section>
          </div>
          <ConversationReview key={item.id} item={item} />
        </>
      )}
    </div>
  );
};
