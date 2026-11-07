import styles from './sidebar.module.scss';
import type { ComponentProps } from 'react';
import { useI18n, type t as translate } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/Icon';

interface NavigationItemProps {
  label: Parameters<typeof translate>[0];
  icon: ComponentProps<typeof Icon>['name'];
  active?: boolean;
}

const NavigationItem = ({ label, icon, active = false }: NavigationItemProps) => {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={`${styles.navItem}${active ? ` ${styles.active}` : ''}`}
      aria-current={active ? 'page' : undefined}
      disabled={!active}
      title={active ? undefined : t('soon')}
    >
      <Icon name={icon} />
      <span>{t(label)}</span>
    </button>
  );
};

export const Sidebar = () => {
  const { t } = useI18n();

  return (
    <aside className={styles.sidebar} aria-label={t('workspace')}>
      <div className={styles.brand}>
        <span className={styles.brandSymbol}>
          <Icon name="sun" />
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
          <Icon name="down" />
        </span>
      </div>
      <nav>
        <div className={styles.navLabel}>WORKSPACE</div>
        <NavigationItem label="home" icon="home" />
        <NavigationItem label="topics" icon="chat" />
        <NavigationItem label="vocabulary" icon="book" active />
        <NavigationItem label="phrases" icon="layers" />
        <div className={`${styles.navLabel} ${styles.exploreLabel}`}>EXPLORE</div>
        <NavigationItem label="profiles" icon="globe" />
        <NavigationItem label="goals" icon="flag" />
        <NavigationItem label="integration" icon="spark" />
        <NavigationItem label="data" icon="cloud" />
        <NavigationItem label="prepare" icon="edit" />
        <NavigationItem label="records" icon="book" />
        <NavigationItem label="guide" icon="spark" />
      </nav>
      <div className={styles.sidebarBottom}>
        <div className={styles.encouragement}>
          <Icon name="spark" />
          <div>
            <strong>{t('motto')}</strong>
            <p>{t('mottoBody')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
