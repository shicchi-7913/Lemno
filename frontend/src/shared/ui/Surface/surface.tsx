import type { ComponentProps } from 'react';

import styles from './surface.module.scss';

type SurfaceProps = ComponentProps<'div'> & {
  as?: 'div' | 'section' | 'article';
};

export const Surface = ({ as: Tag = 'div', className = '', ...props }: SurfaceProps) => (
  <Tag {...props} className={`${styles.card} ${className}`} />
);
