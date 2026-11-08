import type { ComponentProps } from 'react';

import type { HeadingSize } from '../../model/typography';

import sizes from '../typography.module.scss';
import styles from './heading.module.scss';

type HeadingProps = ComponentProps<'h1'> & {
  as: 'h1' | 'h2' | 'h3';
  size?: HeadingSize;
};

export const Heading = ({
  as: Tag,
  size = Tag === 'h1' ? '3xl' : Tag === 'h2' ? 'xl' : 'lg',
  className = '',
  ...props
}: HeadingProps) => (
  <Tag
    {...props}
    className={`${styles.heading} ${styles[Tag]} ${sizes[`size-${size}`]} ${className}`}
  />
);
