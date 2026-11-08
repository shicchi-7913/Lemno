import { Fragment } from 'react';

import appIcon from '@/shared/assets/app-icon.png';
import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui/Icon';

import { navigationGroups } from '../model';

import { LanguageSwitcher } from './language-switcher';
import { NavigationItem } from './navigation-item';

import styles from './sidebar.module.scss';

export const Sidebar = () => {
  const { t } = useI18n();

  return (
    <>
      <div className={styles.brand}>
        <img className={styles.brandSymbol} src={appIcon} alt="" width={40} height={40} />
        <div>
          {/* eslint-disable-next-line i18next/no-literal-string -- Keep the product name unchanged across locales. */}
          <div className={styles.brandName}>
            lemno<span>.</span>
          </div>
          <div className={styles.brandSubtitle}>{t('brandSubtitle')}</div>
        </div>
      </div>
      <LanguageSwitcher />
      <nav>
        {navigationGroups.map((group, index) => (
          <Fragment key={group.heading}>
            <div className={`${styles.navLabel}${index > 0 ? ` ${styles.exploreLabel}` : ''}`}>
              {group.heading}
            </div>
            {group.items.map((item) => (
              <NavigationItem key={item.label} {...item} />
            ))}
          </Fragment>
        ))}
      </nav>
      <div className={styles.sidebarBottom}>
        <div className={styles.encouragement}>
          <Icon name="spark" size={19} />
          <div>
            <strong>{t('motto')}</strong>
            <p>{t('mottoBody')}</p>
          </div>
        </div>
      </div>
    </>
  );
};
