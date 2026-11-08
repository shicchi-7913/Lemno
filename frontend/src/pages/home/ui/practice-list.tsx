import { Link } from 'react-router';

import type { Vocabulary } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui/Icon';
import { Label } from '@/shared/ui/Label';

import styles from './home.module.scss';

export const PracticeList = ({ items, loading }: { items: Vocabulary[]; loading: boolean }) => {
  const { t } = useI18n();
  return (
    <>
      {loading ? (
        <p className={styles.empty}>{t('loading')}</p>
      ) : !items.length ? (
        <p className={styles.empty}>{t('homeNoPractice')}</p>
      ) : (
        <ol className={styles.practiceList}>
          {items.map((item, index) => (
            <li key={item.id}>
              <div className={styles.practiceRow}>
                <span className={styles.practiceNumber}>{String(index + 1).padStart(2, '0')}</span>
                <div className={styles.practiceText}>
                  <strong>{item.text}</strong>
                  <p className={styles.description}>{item.explanation}</p>
                </div>
                <Label size="2xs">{t(item.kind === 'word' ? 'word' : 'phrases')}</Label>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Link className={styles.outlineLink} to="/vocabulary/review">
        {t('conversationReviewVocabulary')}
        <Icon name="arrow" size={16} />
      </Link>
    </>
  );
};
