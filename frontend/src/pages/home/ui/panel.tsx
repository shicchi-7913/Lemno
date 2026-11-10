import { type ReactNode, useId } from 'react';

import { HeadingGroup } from '@/shared/ui/HeadingGroup';
import { Surface } from '@/shared/ui/Surface';

import styles from './home.module.scss';

interface Props {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export const Panel = ({ eyebrow, title, description, action, children }: Props) => {
  const id = useId();
  return (
    <Surface as="section" className={styles.panel} aria-labelledby={id}>
      <HeadingGroup
        as="h2"
        size="md"
        headingId={id}
        className={styles.panelHeader}
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={action}
      />
      {children}
    </Surface>
  );
};
