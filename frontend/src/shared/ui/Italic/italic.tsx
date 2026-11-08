import type { ComponentProps } from 'react';

import styles from './italic.module.scss';

export const Italic = ({ className = '', ...props }: ComponentProps<'p'>) => (
  <p {...props} className={`${styles.italic} ${className}`} />
);
