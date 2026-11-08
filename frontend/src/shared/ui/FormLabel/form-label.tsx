import type { ComponentProps } from 'react';

import type { TextSize } from '../../model/typography';

import sizes from '../typography.module.scss';
import styles from './form-label.module.scss';

type FormLabelProps = ComponentProps<'label'> & {
  hint?: string;
  size?: TextSize;
  hintSize?: TextSize;
};

export const FormLabel = ({
  hint,
  size = 'sm',
  hintSize = '2xs',
  children,
  className = '',
  ...props
}: FormLabelProps) => (
  <label {...props} className={`${styles.label} ${sizes[`size-${size}`]} ${className}`}>
    {children}
    {hint && (
      <>
        {' '}
        <span className={`${styles.hint} ${sizes[`size-${hintSize}`]}`}>{hint}</span>
      </>
    )}
  </label>
);
