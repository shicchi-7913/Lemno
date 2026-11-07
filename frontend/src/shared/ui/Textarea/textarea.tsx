import type { ComponentProps } from 'react';
import styles from './textarea.module.scss';

type TextareaProps = ComponentProps<'textarea'> & {
  status?: 'warning' | 'error';
};

export const Textarea = ({ status, className = '', ...props }: TextareaProps) => (
  <textarea
    {...props}
    data-status={status}
    aria-invalid={status === 'error' ? true : props['aria-invalid']}
    className={`${styles.textarea} ${className}`}
  />
);
