import type { ReactNode } from 'react';

import { Icon } from '../Icon';

import styles from './link.module.scss';

type LinkProps = {
  href: string;
  children: ReactNode;
};

export const Link = ({ href, children }: LinkProps) => (
  <a className={styles.link} href={href} target="_blank" rel="noreferrer">
    {children}
    <Icon name="external" size={15} />
  </a>
);
