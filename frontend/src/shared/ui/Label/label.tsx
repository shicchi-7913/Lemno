import type { ComponentProps } from 'react';

import type { Tone } from '../../model/tone';
import type { TextSize } from '../../model/typography';

import tones from '../tone.module.scss';
import sizes from '../typography.module.scss';
import styles from './label.module.scss';

type LabelProps = ComponentProps<'span'> & {
  tone?: Tone;
  size?: TextSize;
};

export const Label = ({ tone = 'neutral', size = '2xs', className = '', ...props }: LabelProps) => (
  <span
    {...props}
    className={`${styles.label} ${tones[tone]} ${sizes[`size-${size}`]} ${className}`}
  />
);
