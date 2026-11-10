import type { ComponentProps } from 'react';

import { Icon } from '../Icon';

import tones from '../tone.module.scss';
import styles from './alert.module.scss';

type AlertProps = ComponentProps<'div'> & {
  type: 'info' | 'warn' | 'error' | 'success';
};

const appearances = {
  info: { icon: 'info', tone: 'info' },
  warn: { icon: 'warn', tone: 'warning' },
  error: { icon: 'error', tone: 'danger' },
  success: { icon: 'info', tone: 'success' },
} as const;

export const Alert = ({ type, children, className = '', ...props }: AlertProps) => {
  const { icon, tone } = appearances[type];

  return (
    <div
      {...props}
      className={`${styles.alert} ${tones[tone]} ${className}`}
      role={type === 'error' ? 'alert' : 'note'}
    >
      <Icon name={icon} size={17} />
      <div className={styles.content}>{children}</div>
    </div>
  );
};
