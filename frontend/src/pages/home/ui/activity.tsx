import { useI18n } from '@/shared/i18n';

import type { conversationActivity } from '../model';

import styles from './home.module.scss';

const activityLevels = [
  styles.activityLevel0,
  styles.activityLevel1,
  styles.activityLevel2,
  styles.activityLevel3,
];

export const Activity = ({
  days,
  available,
}: {
  days: ReturnType<typeof conversationActivity>['days'];
  available: boolean;
}) => {
  const { t, locale } = useI18n();
  const format = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  return (
    <>
      {available ? (
        <ul className={styles.activity} aria-label={t('homeActivityDescription')}>
          {days.map(({ date, count }) => (
            <li
              key={date.getTime()}
              className={activityLevels[Math.min(count, 3)]}
              tabIndex={0}
              aria-label={t('homeActivityDay', { date: format.format(date), count })}
              title={t('homeActivityDay', { date: format.format(date), count })}
            />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{t('homeActivityUnavailable')}</p>
      )}
      <div className={styles.activityLegend}>
        <span>{format.format(days[0].date)}</span>
        <span>{t('homeActivityLegend')}</span>
        <span>{format.format(days[days.length - 1].date)}</span>
      </div>
    </>
  );
};
