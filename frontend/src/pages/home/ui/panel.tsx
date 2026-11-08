import { type ReactNode, useId } from 'react';

import { Heading } from '@/shared/ui/Heading';

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
    <section className={styles.panel} aria-labelledby={id}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <Heading as="h2" size="md" id={id}>
            {title}
          </Heading>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
};
