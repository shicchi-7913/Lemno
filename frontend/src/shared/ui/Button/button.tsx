import styles from './button.module.scss';
import tones from '../tone.module.scss';
import type { ComponentProps } from 'react';
import type { Tone } from '../tone';

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'solid' | 'outline' | 'ghost';
  tone?: Tone;
  iconOnly?: boolean;
};

export const Button = ({
  variant = 'solid',
  tone = 'brand',
  iconOnly = false,
  className = '',
  ...props
}: ButtonProps) => (
  <button
    {...props}
    className={`${styles.button} ${styles[variant]} ${tones[tone]} ${iconOnly ? styles.iconOnly : ''} ${className}`}
  />
);
