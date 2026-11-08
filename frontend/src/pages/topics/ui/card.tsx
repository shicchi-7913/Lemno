import type { Topic } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';

import { categoryEmoji, categoryKeys, difficultyKeys } from '../model';

import styles from './card.module.scss';

interface CardProps {
  topic: Topic;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const Card = ({ topic, onStart, onEdit, onDelete }: CardProps) => {
  const { t } = useI18n();

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={`${styles.topicEmoji} ${styles[topic.category]}`} aria-hidden="true">
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
      <Heading as="h2" size="md">
        <button type="button" onClick={onStart}>
          {topic.title}
          <Icon name="external" size={13} />
        </button>
      </Heading>
      <p className={styles.topicDescription}>{topic.scenario}</p>
      <div className={styles.cardActions}>
        <Button variant="ghost" onClick={onStart} rightIcon={<Icon name="external" size={15} />}>
          {t('topicStart')}
        </Button>
        <div>
          <Button
            iconOnly
            variant="ghost"
            tone="neutral"
            aria-label={t('editItem', { word: topic.title })}
            onClick={onEdit}
          >
            <Icon name="edit" size={16} />
          </Button>
          <Button
            iconOnly
            variant="ghost"
            tone="neutral"
            aria-label={t('deleteItem', { word: topic.title })}
            onClick={onDelete}
          >
            <Icon name="trash" size={16} />
          </Button>
        </div>
      </div>
    </article>
  );
};
