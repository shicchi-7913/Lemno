import { useRef, useState } from 'react';

import { desktopAvailable, type Topic, type TopicCategory } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';
import { Input } from '@/shared/ui/Input';
import { ToggleButton } from '@/shared/ui/ToggleButton';

import { ConversationTabs, useTopics } from '../../../features/conversation-workspace';
import { categories, categoryEmoji, categoryKeys, difficultyKeys } from '../model';

import { TopicDialog } from './topic-dialog';

import styles from './topics.module.scss';

export const TopicsPage = () => {
  const { t } = useI18n();
  const topics = useTopics();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TopicCategory | 'all'>('all');
  const [dialog, setDialog] = useState<{
    mode: 'create' | 'edit' | 'delete' | 'start';
    topic?: Topic;
  } | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const items = topics.data ?? [];
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
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <div className={styles.eyebrow}>— &nbsp; CONVERSATION LIBRARY</div>
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
            <article className={styles.topicCard} key={topic.id}>
              <div className={styles.cardTop}>
                <span
                  className={`${styles.topicEmoji} ${styles[topic.category]}`}
                  aria-hidden="true"
                >
                  {topic.id === 'seed-restaurant'
                    ? '🍝'
                    : topic.id === 'seed-ideas'
                      ? '💡'
                      : categoryEmoji[topic.category]}
                </span>
                <span className={styles.duration}>
                  <Icon name="clock" size={13} />
                  {t('topicDuration')}
                </span>
              </div>
              <p className={styles.topicMeta}>
                {t(categoryKeys[topic.category])}
                <span>·</span>
                {t(difficultyKeys[topic.difficulty])}
              </p>
              <h2>
                <button type="button" onClick={() => setDialog({ mode: 'start', topic })}>
                  {topic.title}
                  <Icon name="external" size={13} />
                </button>
              </h2>
              <p className={styles.topicDescription}>{topic.scenario}</p>
              <div className={styles.cardActions}>
                <Button
                  variant="ghost"
                  onClick={() => setDialog({ mode: 'start', topic })}
                  rightIcon={<Icon name="external" size={15} />}
                >
                  {t('topicStart')}
                </Button>
                <div>
                  <Button
                    iconOnly
                    variant="ghost"
                    tone="neutral"
                    aria-label={t('editItem', { word: topic.title })}
                    onClick={() => setDialog({ mode: 'edit', topic })}
                  >
                    <Icon name="edit" size={16} />
                  </Button>
                  <Button
                    iconOnly
                    variant="ghost"
                    tone="neutral"
                    aria-label={t('deleteItem', { word: topic.title })}
                    onClick={() => setDialog({ mode: 'delete', topic })}
                  >
                    <Icon name="trash" size={16} />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {dialog && (
        <TopicDialog
          mode={dialog.mode}
          topic={dialog.topic}
          onDismiss={() => setDialog(null)}
          onComplete={() => {
            setDialog(null);
            setQuery('');
            setCategory('all');
            requestAnimationFrame(() => addRef.current?.focus());
          }}
        />
      )}
    </>
  );
};
