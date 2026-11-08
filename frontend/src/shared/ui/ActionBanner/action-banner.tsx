import { type ReactNode, useId } from 'react';

import { Heading } from '../Heading';

import styles from './action-banner.module.scss';

type ActionBannerProps = {
  title: ReactNode;
  children: ReactNode;
  action: ReactNode;
};

export const ActionBanner = ({ title, children, action }: ActionBannerProps) => {
  const titleId = useId();

  return (
    <section className={styles.banner} aria-labelledby={titleId}>
      <div className={styles.content}>
        <Heading as="h2" size="sm" id={titleId} className={styles.title}>
          {title}
        </Heading>
        <div className={styles.description}>{children}</div>
      </div>
      <div className={styles.action}>{action}</div>
    </section>
  );
};
