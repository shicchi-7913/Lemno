import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';

import { conversationApi, desktopAvailable } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';

import { conversationDate, ConversationTabs } from '../../../features/conversation-workspace';

import styles from './history.module.scss';

export const ConversationHistoryPage = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const history = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationApi.list,
    enabled: desktopAvailable,
  });
  const items = history.data ?? [];
  const now = new Date();
  const thisMonth = items.filter((item) => {
    const date = new Date(item.occurredAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const stats = [
    { label: 'conversationTotal', value: t('conversationTimes', { count: items.length }) },
    {
      label: 'conversationTotalTime',
      value: t('conversationMinutes', {
        count: items.reduce((sum, item) => sum + item.durationMinutes, 0),
      }),
    },
    { label: 'conversationThisMonth', value: t('conversationTimes', { count: thisMonth.length }) },
  ] as const;
  return (
    <div className={styles.contained}>
      <section className={styles.pageHeading}>
        <div>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <div className={styles.eyebrow}>CONVERSATION HISTORY</div>
          <Heading as="h1">{t('conversationHistory')}</Heading>
          <p>{t('conversationHistorySubtitle')}</p>
        </div>
        <Button leftIcon={<Icon name="plus" />} onClick={() => navigate('/conversations/new')}>
          {t('conversationAdd')}
        </Button>
      </section>
      <ConversationTabs />
      {!desktopAvailable && <p className={styles.notice}>{t('conversationDesktopOnly')}</p>}
      <section className={styles.statistics} aria-label={t('conversationHistory')}>
        {stats.map((stat) => (
          <div className={styles.statCard} key={stat.label}>
            <h2>{t(stat.label)}</h2>
            <strong>{history.isLoading || history.isError ? '—' : stat.value}</strong>
          </div>
        ))}
      </section>
      <section className={styles.panel}>
        <h2 className={styles.panelHeading}>
          <Icon name="undo" size={16} />
          {t('conversationRecent')}
        </h2>
        {history.isLoading ? (
          <p className={styles.empty}>{t('conversationLoading')}</p>
        ) : history.isError ? (
          <div className={styles.empty} role="alert">
            <p>{t('conversationLoadError')}</p>
            <Button variant="outline" onClick={() => void history.refetch()}>
              {t('retry')}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="headphones" size={30} />
            <h3>{t('conversationEmpty')}</h3>
            <p>{t('conversationEmptyBody')}</p>
            <Button variant="outline" onClick={() => navigate('/conversations/new')}>
              {t('conversationAdd')}
            </Button>
          </div>
        ) : (
          items.map((item) => (
            <Link className={styles.historyRow} key={item.id} to={`/conversations/${item.id}`}>
              <span className={styles.sessionIcon}>
                <Icon name="headphones" size={23} />
              </span>
              <div className={styles.sessionText}>
                <h3>{item.title || t('conversationUntitled')}</h3>
                <p>{item.notes}</p>
              </div>
              <div className={styles.sessionMeta}>
                <strong>{t('conversationMinutes', { count: item.durationMinutes })}</strong>
                <span>
                  {conversationDate(item.occurredAt, locale)} · {item.ai}
                </span>
              </div>
              <Icon name="chevron" size={16} />
            </Link>
          ))
        )}
      </section>
    </div>
  );
};
