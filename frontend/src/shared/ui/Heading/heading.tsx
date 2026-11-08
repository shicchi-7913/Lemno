import type { ComponentProps } from 'react';

import type { HeadingSize } from '../typography';

import sizes from '../typography.module.scss';
import styles from './heading.module.scss';

type HeadingProps = ComponentProps<'h1'> & {
  as: 'h1' | 'h2';
  size?: HeadingSize;
};

export const Heading = ({
  as: Tag,
  size = Tag === 'h1' ? '3xl' : 'xl',
  className = '',
  ...props
}: HeadingProps) => (
  <Tag
    {...props}
    className={`${styles.heading} ${styles[Tag]} ${sizes[`size-${size}`]} ${className}`}
  />
);
