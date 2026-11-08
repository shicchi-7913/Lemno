import type { ComponentProps } from 'react';

import type { HeadingSize } from '../../model/typography';

import sizes from '../typography.module.scss';
import styles from './heading.module.scss';

const defaultSizes = {
  h1: '3xl',
  h2: 'xl',
  h3: 'lg',
  h4: 'md',
  h5: 'sm',
} as const;

type HeadingProps = ComponentProps<'h1'> & {
  as: keyof typeof defaultSizes;
  size?: HeadingSize;
};

export const Heading = ({
  as: Tag,
  size = defaultSizes[Tag],
  className = '',
  ...props
}: HeadingProps) => (
  <Tag
    {...props}
    className={`${styles.heading} ${styles[Tag]} ${sizes[`size-${size}`]} ${className}`}
  />
);
