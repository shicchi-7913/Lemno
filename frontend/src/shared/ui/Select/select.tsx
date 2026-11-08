import type { ComponentProps } from 'react';

import type { TextSize } from '../typography';

import sizes from '../typography.module.scss';
import styles from './select.module.scss';

type SelectProps = Omit<ComponentProps<'select'>, 'size'> & {
  size?: TextSize;
  htmlSize?: ComponentProps<'select'>['size'];
};

export const Select = ({ size = 'xs', htmlSize, className = '', ...props }: SelectProps) => (
  <select
    {...props}
    size={htmlSize}
    className={`${styles.select} ${sizes[`size-${size}`]} ${className}`}
  />
);
