import type { ComponentProps } from 'react';

import type { TextSize } from '../../model/typography';

import sizes from '../typography.module.scss';
import styles from './avatar.module.scss';

type AvatarProps = ComponentProps<'span'> & {
  size?: TextSize;
};

export const Avatar = ({ size = 'sm', className = '', ...props }: AvatarProps) => (
  <span {...props} className={`${styles.avatar} ${sizes[`size-${size}`]} ${className}`} />
);
