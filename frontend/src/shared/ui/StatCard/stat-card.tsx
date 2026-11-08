import type { ComponentProps, ReactNode } from 'react';

import styles from './stat-card.module.scss';

type StatCardProps = ComponentProps<'dl'> & {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
};

export const StatCard = ({
  label,
  value,
  unit,
  icon,
  description,
  className = '',
  ...props
}: StatCardProps) => (
  <dl {...props} className={`${styles.card} ${className}`}>
    <dt className={styles.label}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {label}
    </dt>
    <dd className={styles.content}>
      <div className={styles.value}>
        <strong>{value}</strong>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {description && <p className={styles.description}>{description}</p>}
    </dd>
  </dl>
);
