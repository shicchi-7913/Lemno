import type { ComponentProps } from 'react';
import styles from './spinner.module.scss';

type SpinnerProps = ComponentProps<'span'>;

export const Spinner = ({ className = '', ...props }: SpinnerProps) => (
  <span aria-hidden="true" {...props} className={`${styles.spinner} ${className}`} />
);
