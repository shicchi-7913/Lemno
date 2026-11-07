import type { ComponentProps } from 'react';
import styles from './avatar.module.scss';

type AvatarProps = ComponentProps<'span'>;

export const Avatar = ({ className = '', ...props }: AvatarProps) => (
  <span {...props} className={`${styles.avatar} ${className}`} />
);
