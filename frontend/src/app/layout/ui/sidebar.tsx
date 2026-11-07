import styles from './sidebar.module.scss';
import { Fragment } from 'react';
import { useI18n } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/Icon';
import { navigationGroups } from '../model';
import { NavigationItem } from './navigation-item';

export const Sidebar = () => {
  const { t } = useI18n();

  return (
    <>
      <div className={styles.brand}>
        <span className={styles.brandSymbol}>
          <Icon name="sun" size={24} />
        </span>
        <div>
          {/* eslint-disable-next-line i18next/no-literal-string -- Keep the product name unchanged across locales. */}
          <div className={styles.brandName}>
            lemno<span>.</span>
          </div>
          <div className={styles.brandSubtitle}>{t('brandSubtitle')}</div>
        </div>
      </div>
      <div className={styles.profileCard}>
        <span className={styles.profileFlag} aria-hidden="true">
          🇯🇵
        </span>
        <div>
          <strong>{t('profile')}</strong>
        </div>
        <span className={styles.profileChevron}>
          <Icon name="down" size={13} />
        </span>
      </div>
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
