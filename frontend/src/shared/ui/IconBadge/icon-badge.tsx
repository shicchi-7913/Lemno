import type { ComponentProps, CSSProperties } from 'react';

import type { Tone } from '../../model/tone';
import { Icon } from '../Icon';

import tones from '../tone.module.scss';
import styles from './icon-badge.module.scss';

type IconBadgeProps = Omit<ComponentProps<'span'>, 'children'> & {
  name: ComponentProps<typeof Icon>['name'];
  size?: number;
  iconScale?: number;
  tone?: Tone;
};

export const IconBadge = ({
  name,
  size = 48,
  iconScale = 0.48,
  tone = 'brand',
  className = '',
  style,
  ...props
}: IconBadgeProps) => (
  <span
    {...props}
    className={`${styles.badge} ${tones[tone]} ${className}`}
    style={{ ...style, '--icon-badge-size': `${size}px` } as CSSProperties}
  >
    <Icon name={name} size={Math.round(size * iconScale)} />
  </span>
);
