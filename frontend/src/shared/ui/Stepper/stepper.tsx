import type { ComponentProps } from 'react';

import { Icon } from '../Icon';

import styles from './stepper.module.scss';

type StepperProps = Omit<ComponentProps<'ol'>, 'children'> & {
  steps: readonly string[];
  /** Zero-based index of the current step. */
  currentStep: number;
};

export const Stepper = ({ steps, currentStep, className = '', ...props }: StepperProps) => (
  <ol {...props} className={`${styles.stepper} ${className}`} role="list">
    {steps.map((label, index) => (
      <li
        key={`${index}-${label}`}
        className={`${styles.step} ${index <= currentStep ? styles.active : ''}`}
        aria-current={index === currentStep ? 'step' : undefined}
      >
        <span className={styles.indicator}>
          {index < currentStep ? <Icon name="check" size={15} /> : index + 1}
        </span>
        {label}
      </li>
    ))}
  </ol>
);
