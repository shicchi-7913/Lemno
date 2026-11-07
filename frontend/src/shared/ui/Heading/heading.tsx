import type { ComponentProps } from 'react';
import styles from './heading.module.scss';

type HeadingProps = ComponentProps<'h1'> & {
  as: 'h1' | 'h2';
};

export const Heading = ({ as: Tag, className = '', ...props }: HeadingProps) => (
  <Tag {...props} className={`${styles.heading} ${styles[Tag]} ${className}`} />
);
