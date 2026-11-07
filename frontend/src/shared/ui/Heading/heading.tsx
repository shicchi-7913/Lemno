import type { ComponentProps } from 'react';
import styles from './heading.module.scss';
import sizes from '../typography.module.scss';
import type { HeadingSize } from '../typography';

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
