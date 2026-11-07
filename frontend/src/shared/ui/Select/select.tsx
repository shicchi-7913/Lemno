import type { ComponentProps } from 'react';
import styles from './select.module.scss';

type SelectProps = ComponentProps<'select'>;

export const Select = ({ className = '', ...props }: SelectProps) => (
  <select {...props} className={`${styles.select} ${className}`} />
);
