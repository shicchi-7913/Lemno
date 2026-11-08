import type { ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { Heading } from '@/shared/ui/Heading';

import styles from './profiles.module.scss';

type Props = {
  flag: string;
  title: string;
  name: string;
  selected: boolean;
  action: ReactNode;
};

export const LanguageCard = ({ flag, title, name, selected, action }: Props) => {
  const { t } = useI18n();

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.flag} aria-hidden="true">
          {flag}
        </span>
        {selected && <span className={styles.badge}>{t('languageInUse')}</span>}
      </div>
      <Heading as="h2" size="lg">
        {title}
      </Heading>
      <p className={styles.languageName}>{name}</p>
      <div className={styles.actions}>{action}</div>
    </article>
  );
};
