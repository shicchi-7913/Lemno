import type { ComponentProps } from 'react';
import styles from './toggle-button.module.scss';

type ToggleButtonProps = Omit<ComponentProps<'button'>, 'aria-pressed'> & {
  pressed: boolean;
};

export const ToggleButton = ({
  pressed,
  type = 'button',
  className = '',
  ...props
}: ToggleButtonProps) => (
  <button
    {...props}
    type={type}
    aria-pressed={pressed}
    className={`${styles.button} ${className}`}
  />
);
