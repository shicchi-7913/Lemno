import type { ComponentProps } from 'react';
import styles from './form-label.module.scss';
import sizes from '../typography.module.scss';
import type { TextSize } from '../typography';

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
