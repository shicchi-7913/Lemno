import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { desktopAvailable, type Topic, type TopicCategory } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';
import { Input } from '@/shared/ui/Input';
import { ToggleButton } from '@/shared/ui/ToggleButton';

import {
  categoryKeys,
  ConversationTabs,
  useTopics,
} from '../../../features/conversation-workspace';
import { categories } from '../model';

import { Card } from './card';
import { TopicDialog } from './topic-dialog';

import styles from './topics.module.scss';

export const TopicsPage = () => {
  const { t } = useI18n();
  const topics = useTopics();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TopicCategory | 'all'>('all');
  const [dialog, setDialog] = useState<{
    mode: 'create' | 'edit' | 'delete' | 'start';
    topic?: Topic;
  } | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const items = topics.data ?? [];
  const requestedTopic = items.find((item) => item.id === searchParams.get('start'));
  const activeDialog =
    dialog ?? (requestedTopic ? { mode: 'start' as const, topic: requestedTopic } : null);

  function closeDialog() {
    setDialog(null);
    if (searchParams.has('start')) {
      const next = new URLSearchParams(searchParams);
      next.delete('start');
      setSearchParams(next, { replace: true });
    }
  }
  const visible = items.filter(
    (topic) =>
      (category === 'all' || topic.category === category) &&
      `${topic.title} ${topic.scenario}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <>
      <section className={styles.pageHeading}>
        <div>
          <Heading as="h1">{t('topics')}</Heading>
          <p>{t('topicSubtitle')}</p>
        </div>
        <Button
          ref={addRef}
          disabled={!desktopAvailable || !topics.data}
          leftIcon={<Icon name="plus" />}
          onClick={() => setDialog({ mode: 'create' })}
        >
          {t('topicCreate')}
        </Button>
      </section>
      <ConversationTabs />
      {!desktopAvailable && <p className={styles.notice}>{t('conversationDesktopOnly')}</p>}
      <div className={styles.searchToolbar}>
        <div className={styles.searchField}>
          <Icon name="search" size={17} />
          <Input
            variant="plain"
            type="search"
            placeholder={t('topicSearch')}
            aria-label={t('topicSearch')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span>{t('topicCount', { count: items.length })}</span>
      </div>
      <div className={styles.filters} role="group" aria-label={t('topicCategory')}>
        <ToggleButton pressed={category === 'all'} onClick={() => setCategory('all')}>
          {t('all')}
        </ToggleButton>
        {categories.map((value) => (
          <ToggleButton key={value} pressed={category === value} onClick={() => setCategory(value)}>
            {t(categoryKeys[value])}
          </ToggleButton>
        ))}
      </div>
      {topics.isLoading ? (
        <p className={styles.empty}>{t('conversationLoading')}</p>
      ) : topics.isError ? (
        <div className={styles.empty} role="alert">
          <p>{t('conversationLoadError')}</p>
          <Button variant="outline" onClick={() => void topics.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="chat" size={28} />
          <p>{t(items.length ? 'topicNoResults' : 'topicEmpty')}</p>
          {items.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              {t('reset')}
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.topicGrid}>
          {visible.map((topic) => (
            <Card
              key={topic.id}
              topic={topic}
              onStart={() => setDialog({ mode: 'start', topic })}
              onEdit={() => setDialog({ mode: 'edit', topic })}
              onDelete={() => setDialog({ mode: 'delete', topic })}
            />
          ))}
        </div>
      )}
      {activeDialog && (
        <TopicDialog
          mode={activeDialog.mode}
          topic={activeDialog.topic}
          onDismiss={closeDialog}
          onComplete={() => {
            closeDialog();
            setQuery('');
            setCategory('all');
            requestAnimationFrame(() => addRef.current?.focus());
          }}
        />
      )}
    </>
  );
};
