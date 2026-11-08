import type { ReactNode } from 'react';

import { Icon } from '../Icon';

import tones from '../tone.module.scss';
import styles from './alert.module.scss';

type AlertProps = {
  type: 'info' | 'warn' | 'error';
  children: ReactNode;
};

const appearances = {
  info: { icon: 'info', tone: 'info' },
  warn: { icon: 'warn', tone: 'warning' },
  error: { icon: 'error', tone: 'danger' },
} as const;

export const Alert = ({ type, children }: AlertProps) => {
  const { icon, tone } = appearances[type];

  return (
    <div className={`${styles.alert} ${tones[tone]}`} role={type === 'error' ? 'alert' : 'note'}>
      <Icon name={icon} size={17} />
      <div className={styles.content}>{children}</div>
    </div>
  );
};
