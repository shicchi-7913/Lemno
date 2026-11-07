import type { ComponentProps } from 'react';
import styles from './input.module.scss';
import sizes from '../typography.module.scss';
import type { TextSize } from '../typography';

type InputProps = Omit<ComponentProps<'input'>, 'size'> & {
  variant?: 'default' | 'plain';
  status?: 'warning' | 'error';
  size?: TextSize;
  htmlSize?: ComponentProps<'input'>['size'];
};

export const Input = ({
  variant = 'default',
  status,
  size = variant === 'plain' ? 'sm' : 'md',
  htmlSize,
  className = '',
  ...props
}: InputProps) => (
  <input
    {...props}
    size={htmlSize}
    data-status={status}
    aria-invalid={status === 'error' ? true : props['aria-invalid']}
    className={`${styles.input} ${styles[variant]} ${sizes[`size-${size}`]} ${className}`}
  />
);
