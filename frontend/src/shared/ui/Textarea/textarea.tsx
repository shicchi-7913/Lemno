import type { ComponentProps } from 'react';

import type { TextSize } from '../../model/typography';

import sizes from '../typography.module.scss';
import styles from './textarea.module.scss';

type TextareaProps = ComponentProps<'textarea'> & {
  status?: 'warning' | 'error';
  size?: TextSize;
};

export const Textarea = ({ status, size = 'md', className = '', ...props }: TextareaProps) => (
  <textarea
    {...props}
    data-status={status}
    aria-invalid={status === 'error' ? true : props['aria-invalid']}
    className={`${styles.textarea} ${sizes[`size-${size}`]} ${className}`}
  />
);
