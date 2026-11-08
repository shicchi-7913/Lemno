import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';

import { conversationApi, desktopAvailable } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';

import { conversationDate } from '../../../features/conversation-workspace';

import styles from './record.module.scss';

export const ConversationRecordPage = () => {
  const { t, locale } = useI18n();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const record = useQuery({
    queryKey: ['conversations', id],
    queryFn: () => conversationApi.detail(id),
    enabled: desktopAvailable && !!id,
  });
  const item = record.data;
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
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <div className={styles.eyebrow}>SESSION RECORD</div>
              <Heading as="h1">{item.title || t('conversationUntitled')}</Heading>
              <p>
                {conversationDate(item.occurredAt, locale)} · {item.ai} ·{' '}
                {t('conversationMinutes', { count: item.durationMinutes })}
              </p>
            </div>
          </section>
          <div className={styles.detailGrid}>
            <section className={`${styles.panel} ${styles.notesPanel}`}>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <div className={styles.eyebrow}>CONVERSATION NOTES</div>
              <h2 className={styles.sectionHeading}>{t('conversationReflection')}</h2>
              <p className={styles.noteContent}>{item.notes}</p>
              <div className={styles.badges}>
                <span>{item.ai}</span>
                <span>{t('conversationPracticeMinutes', { count: item.durationMinutes })}</span>
              </div>
            </section>
            <section className={`${styles.panel} ${styles.expressionsPanel}`}>
              <h2 className={styles.sectionHeading}>{t('conversationUsedExpressions')}</h2>
              {item.usedItems.length ? (
                item.usedItems.map((expression) => (
                  <Link
                    key={expression.id}
                    to={expression.kind === 'word' ? '/' : '/phrases'}
                    className={styles.usedExpression}
                  >
                    <Icon name="check" size={16} />
                    {expression.text}
                  </Link>
                ))
              ) : (
                <p className={styles.muted}>{t('conversationNoExpressions')}</p>
              )}
              <h2 className={styles.sectionHeading}>{t('conversationLearnedExpressions')}</h2>
              {item.learnedItems.length ? (
                item.learnedItems.map((expression) => (
                  <Link
                    key={expression.id}
                    to={expression.kind === 'word' ? '/' : '/phrases'}
                    className={styles.learnedExpression}
                  >
                    <Icon name="book" size={16} />
                    {expression.text}
                  </Link>
                ))
              ) : (
                <p className={styles.muted}>{t('conversationNoExpressions')}</p>
              )}
              <Button
                className={styles.fullWidth}
                variant="outline"
                onClick={() => navigate('/')}
                rightIcon={<Icon name="arrow" size={16} />}
              >
                {t('conversationReviewVocabulary')}
              </Button>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
