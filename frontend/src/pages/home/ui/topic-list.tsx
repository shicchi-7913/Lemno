import { Link } from 'react-router';

import type { Topic } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui/Icon';

import {
  categoryEmoji,
  categoryKeys,
  difficultyKeys,
} from '../../../features/conversation-workspace';

import styles from './home.module.scss';

export const TopicList = ({ items, loading }: { items: Topic[]; loading: boolean }) => {
  const { t } = useI18n();
  if (loading) return <p className={styles.empty}>{t('conversationLoading')}</p>;
  if (!items.length) return <p className={styles.empty}>{t('topicEmpty')}</p>;
  return (
    <div className={styles.topicList}>
      {items.slice(0, 3).map((topic) => (
        <Link
          key={topic.id}
          className={styles.topicRow}
          to={`/topics?start=${encodeURIComponent(topic.id)}`}
        >
          <span className={`${styles.topicEmoji} ${styles[topic.category]}`} aria-hidden="true">
            {categoryEmoji[topic.category]}
          </span>
          <div className={styles.topicText}>
            <p className={styles.topicMeta}>
              {t(categoryKeys[topic.category])} · {t(difficultyKeys[topic.difficulty])}
            </p>
            <strong>{topic.title}</strong>
            <p className={styles.description}>{topic.scenario}</p>
          </div>
          <Icon name="chevron" size={16} />
        </Link>
      ))}
    </div>
  );
};
