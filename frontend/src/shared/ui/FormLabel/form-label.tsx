import type { ComponentProps } from 'react';
import styles from './form-label.module.scss';

type FormLabelProps = ComponentProps<'label'> & {
  hint?: string;
};

export const FormLabel = ({ hint, children, className = '', ...props }: FormLabelProps) => (
  <label {...props} className={`${styles.label} ${className}`}>
    {children}
    {hint && (
      <>
        {' '}
        <span className={styles.hint}>{hint}</span>
      </>
    )}
  </label>
);
