import type { ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { Heading } from '@/shared/ui/Heading';
import { IconBadge } from '@/shared/ui/IconBadge';
import { Label } from '@/shared/ui/Label';
import { Surface } from '@/shared/ui/Surface';

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
    <Surface as="article" className={styles.card}>
      <div className={styles.cardTop}>
        <IconBadge className={styles.flag} aria-hidden="true">
          {flag}
        </IconBadge>
        {selected && (
          <Label tone="success" className={styles.badge}>
            {t('languageInUse')}
          </Label>
        )}
      </div>
      <Heading as="h2" size="lg">
        {title}
      </Heading>
      <p className={styles.languageName}>{name}</p>
      <div className={styles.actions}>{action}</div>
    </Surface>
  );
};
