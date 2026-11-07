import type { ComponentProps } from 'react';
import styles from './label.module.scss';
import tones from '../tone.module.scss';
import type { Tone } from '../tone';

type LabelProps = ComponentProps<'span'> & {
  tone?: Tone;
};

export const Label = ({ tone = 'neutral', className = '', ...props }: LabelProps) => (
  <span {...props} className={`${styles.label} ${tones[tone]} ${className}`} />
);
