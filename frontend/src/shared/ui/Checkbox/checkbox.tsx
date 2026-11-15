import type { ComponentProps } from 'react';

import styles from './checkbox.module.scss';

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'>;

export const Checkbox = ({ className = '', ...props }: CheckboxProps) => (
  <input {...props} type="checkbox" className={`${styles.checkbox} ${className}`} />
);
