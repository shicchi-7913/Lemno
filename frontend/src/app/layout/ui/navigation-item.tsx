import { NavLink } from 'react-router';

import { useI18n } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/Icon';
import type { NavigationEntry } from '../model';

import styles from './sidebar.module.scss';

export const NavigationItem = ({ label, icon, to }: NavigationEntry) => {
  const { t } = useI18n();
  const content = (
    <>
      <Icon name={icon} />
      <span>{t(label)}</span>
    </>
  );

  if (to !== undefined) {
    return (
      <NavLink
        to={to}
        end={to === '/'}
        className={({ isActive }) => `${styles.navItem}${isActive ? ` ${styles.active}` : ''}`}
      >
        {content}
      </NavLink>
    );
  }

  return (
    <button type="button" className={styles.navItem} disabled title={t('soon')}>
      {content}
    </button>
  );
};
