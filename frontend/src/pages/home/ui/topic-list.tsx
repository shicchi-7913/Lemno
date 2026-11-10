import { Link } from 'react-router';

import type { Topic } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';

import {
  categoryEmoji,
  categoryKeys,
  difficultyKeys,
} from '../../../features/conversation-workspace';

import styles from './home.module.scss';

const categoryTones = {
  daily: 'danger',
  work: 'info',
  travel: 'success',
  hobby: 'success',
} as const;

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
          <IconBadge
            className={styles.topicEmoji}
            tone={categoryTones[topic.category]}
            size={60}
            aria-hidden="true"
          >
            {categoryEmoji[topic.category]}
          </IconBadge>
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
