import type { ComponentProps, ReactNode } from 'react';

import styles from './stat-card.module.scss';

type StatCardProps = ComponentProps<'dl'> & {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
};

export const StatCard = ({ label, value, unit, className = '', ...props }: StatCardProps) => (
  <dl {...props} className={`${styles.card} ${className}`}>
    <dt className={styles.label}>{label}</dt>
    <dd className={styles.value}>
      <strong>{value}</strong>
      {unit && <span className={styles.unit}>{unit}</span>}
    </dd>
  </dl>
);
