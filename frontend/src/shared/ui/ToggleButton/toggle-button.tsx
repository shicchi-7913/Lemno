import type { ComponentProps } from 'react';

import type { TextSize } from '../../model/typography';
import { ButtonBase } from '../ButtonBase';

import sizes from '../typography.module.scss';
import styles from './toggle-button.module.scss';

type ToggleButtonProps = Omit<ComponentProps<'button'>, 'aria-pressed'> & {
  pressed: boolean;
  size?: TextSize;
};

export const ToggleButton = ({
  pressed,
  size = 'xs',
  type = 'button',
  className = '',
  ...props
}: ToggleButtonProps) => (
  <ButtonBase
    {...props}
    type={type}
    aria-pressed={pressed}
    className={`${styles.button} ${sizes[`size-${size}`]} ${className}`}
  />
);
