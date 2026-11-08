import type { CSSProperties } from 'react';

import { useI18n } from '@/shared/i18n';
import { Heading } from '@/shared/ui/Heading';

import styles from './review.module.scss';

export const GoalPanel = ({ reviewed }: { reviewed: number }) => {
  const { t } = useI18n();
  return (
    <aside className={styles.goalSidebar}>
      <section className={styles.goalPanel} aria-label={t('todayGoal')}>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <p className={styles.eyebrow}>TODAY’S GOAL</p>
        <Heading as="h2" size="md">
          {t('goalMessageTop')}
          <br />
          {t('goalMessageBottom')}
        </Heading>
        <div
          className={styles.goalRing}
          style={{ '--goal-progress': `${Math.min(reviewed / 5, 1) * 100}%` } as CSSProperties}
          role="progressbar"
          aria-label={t('todayGoal')}
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={Math.min(reviewed, 5)}
          aria-valuetext={t('reviewedCount', { count: reviewed })}
        >
          <strong>{reviewed}</strong>
          <span>{t('cardsReviewed')}</span>
        </div>
        <p className={styles.goalHint}>{t('goalHint')}</p>
      </section>
      <section className={styles.usageReminder}>
        <Heading as="h2">{t('usageReminderTitle')}</Heading>
        <p>{t('usageReminderBody')}</p>
      </section>
    </aside>
  );
};
