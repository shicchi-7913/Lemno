import type { ComponentProps } from 'react';

import type { Tone } from '../../model/tone';
import type { TextSize } from '../../model/typography';

import tones from '../tone.module.scss';
import sizes from '../typography.module.scss';
import styles from './button.module.scss';

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'solid' | 'outline' | 'ghost';
  tone?: Tone;
  iconOnly?: boolean;
  size?: TextSize;
};

export const Button = ({
  variant = 'solid',
  tone = 'brand',
  iconOnly = false,
  size = 'sm',
  className = '',
  ...props
}: ButtonProps) => (
  <button
    {...props}
    className={`${styles.button} ${styles[variant]} ${tones[tone]} ${sizes[`size-${size}`]} ${iconOnly ? styles.iconOnly : ''} ${className}`}
  />
);
