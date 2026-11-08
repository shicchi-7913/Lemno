import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { conversationApi, desktopAvailable } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { StatCard } from '@/shared/ui/StatCard';

import { useTopics } from '../../../features/conversation-workspace';
import { useVocabulary } from '../../../features/manage-vocabulary';
import { memoryStatus } from '../../../features/study-library';
import { conversationActivity, practiceCandidates } from '../model';

import { Activity } from './activity';
import { Hero } from './hero';
import { Panel } from './panel';
import { PracticeList } from './practice-list';
import { TopicList } from './topic-list';

import styles from './home.module.scss';

export const HomePage = () => {
  const { t, locale } = useI18n();
  const words = useVocabulary('word');
  const phrases = useVocabulary('phrase');
  const topics = useTopics();
  const history = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationApi.list,
    enabled: desktopAvailable,
  });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const queries = [words, phrases, topics, history];
  const items = [...(words.data ?? []), ...(phrases.data ?? [])];
  const expressionsAvailable = desktopAvailable && !!words.data && !!phrases.data;
  const historyAvailable = desktopAvailable && !!history.data;
  const activity = conversationActivity(history.data ?? [], now);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(now);
  const stats = [
    {
      label: 'homeStreak',
      value: historyAvailable ? activity.streak : '—',
      unit: 'homeDayUnit',
      description: 'homeStreakHint',
      icon: 'flame',
      tone: 'warning',
    },
    {
      label: 'homeSavedWords',
      value: desktopAvailable && words.data ? words.data.length : '—',
      unit: 'homeWordUnit',
      description: 'homeSavedHint',
      icon: 'book',
      tone: 'info',
    },
    {
      label: 'homeMastered',
      value: expressionsAvailable
        ? items.filter((item) => memoryStatus(item) === 'mastered').length
        : '—',
      unit: 'homeExpressionUnit',
      description: 'homeMasteredHint',
      icon: 'circleCheck',
      tone: 'success',
    },
    {
      label: 'homeUsed',
      value: expressionsAvailable ? items.filter((item) => item.usageCount > 0).length : '—',
      unit: 'homeExpressionUnit',
      description: 'homeUsedHint',
      icon: 'chat',
      tone: 'brand',
    },
  ] as const;

  return (
    <div className={styles.home}>
      <section className={styles.welcome}>
        <div>
          <Heading as="h1">
            {t('homeWelcome')} <Icon name="sun" size={25} className={styles.welcomeSun} />
          </Heading>
          <p className={styles.description}>{t('homeWelcomeBody')}</p>
        </div>
        <time className={styles.date} dateTime={now.toISOString()}>
          <Icon name="calendar" size={15} />
          {dateLabel}
        </time>
      </section>
      <Hero />
      {!desktopAvailable && <Alert type="info">{t('homeDesktopOnly')}</Alert>}
      {queries.some((query) => query.isError) && (
        <Alert type="error">
          <p>{t('homeLoadError')}</p>
          <Button
            variant="outline"
            onClick={() => {
              for (const query of queries) {
                if (query.isError) void query.refetch();
              }
            }}
          >
            {t('retry')}
          </Button>
        </Alert>
      )}
      <section className={styles.statistics} aria-label={t('homeStatistics')}>
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={t(stat.label)}
            value={stat.value}
            unit={t(stat.unit)}
            description={t(stat.description)}
            icon={<IconBadge name={stat.icon} tone={stat.tone} size={36} />}
          />
        ))}
      </section>
      <div className={styles.practiceGrid}>
        <Panel
          eyebrow={t('homeTopicsEyebrow')}
          title={t('homeTopicsTitle')}
          description={t('homeTopicsDescription')}
          action={
            <Link className={styles.textLink} to="/topics">
              {t('homeViewAll')} <Icon name="external" size={14} />
            </Link>
          }
        >
          <TopicList items={topics.data ?? []} loading={topics.isLoading} />
        </Panel>
        <Panel
          eyebrow={t('homeNextEyebrow')}
          title={t('homeNextTitle')}
          description={t('homeNextDescription')}
        >
          <PracticeList
            items={
              expressionsAvailable
                ? practiceCandidates(items.filter((item) => memoryStatus(item) !== 'mastered'))
                : []
            }
            loading={words.isLoading || phrases.isLoading}
          />
        </Panel>
      </div>
      <div className={styles.bottomGrid}>
        <Panel
          eyebrow={t('homeConsistencyEyebrow')}
          title={t('homeActivityTitle')}
          description={t('homeActivityDescription')}
        >
          <Activity days={activity.days} available={historyAvailable} />
        </Panel>
        <Panel eyebrow={t('homeWorkflowEyebrow')} title={t('homeWorkflowTitle')}>
          <p className={styles.workflowDescription}>{t('homeWorkflowDescription')}</p>
          <Link className={styles.outlineLink} to="/conversations/new">
            <Icon name="plus" size={16} />
            {t('conversationAdd')}
          </Link>
          <p className={styles.workflowNote}>
            <Icon name="circleCheck" size={12} />
            {t('homeWorkflowNote')}
          </p>
        </Panel>
      </div>
    </div>
  );
};
