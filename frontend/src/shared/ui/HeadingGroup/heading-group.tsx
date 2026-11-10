import type { ComponentProps, ReactNode } from 'react';

import type { TextSize } from '../../model/typography';
import { Heading } from '../Heading';

import sizes from '../typography.module.scss';
import styles from './heading-group.module.scss';

type HeadingGroupProps = Omit<ComponentProps<'div'>, 'title' | 'children'> & {
  as: ComponentProps<typeof Heading>['as'];
  size?: ComponentProps<typeof Heading>['size'];
  headingId?: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  descriptionSize?: TextSize;
  action?: ReactNode;
};

export const HeadingGroup = ({
  as,
  size,
  headingId,
  title,
  eyebrow,
  description,
  descriptionSize = 'xs',
  action,
  className = '',
  ...props
}: HeadingGroupProps) => (
  <div {...props} className={`${styles.group} ${className}`}>
    <div>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <Heading as={as} size={size} id={headingId}>
        {title}
      </Heading>
      {description && (
        <p className={`${styles.description} ${sizes[`size-${descriptionSize}`]}`}>{description}</p>
      )}
    </div>
    {action}
  </div>
);
