import type { ComponentProps } from 'react';
import styles from './input.module.scss';

type InputProps = ComponentProps<'input'> & {
  variant?: 'default' | 'plain';
  status?: 'warning' | 'error';
};

export const Input = ({ variant = 'default', status, className = '', ...props }: InputProps) => (
  <input
    {...props}
    data-status={status}
    aria-invalid={status === 'error' ? true : props['aria-invalid']}
    className={`${styles.input} ${styles[variant]} ${className}`}
  />
);
