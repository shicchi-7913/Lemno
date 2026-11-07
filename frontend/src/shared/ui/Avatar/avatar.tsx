import type { ComponentProps } from 'react';
import styles from './avatar.module.scss';
import sizes from '../typography.module.scss';
import type { TextSize } from '../typography';

type AvatarProps = ComponentProps<'span'> & {
  size?: TextSize;
};

export const Avatar = ({ size = 'sm', className = '', ...props }: AvatarProps) => (
  <span {...props} className={`${styles.avatar} ${sizes[`size-${size}`]} ${className}`} />
);
