import { NavLink } from 'react-router';

import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui/Icon';

import styles from './navigation.module.scss';

export const ConversationTabs = () => {
  const { t } = useI18n();
  return (
    <nav className={styles.tabs} aria-label={t('topics')}>
      <NavLink to="/topics" end className={({ isActive }) => (isActive ? styles.activeTab : '')}>
        <Icon name="chat" size={17} />
        {t('topicBrowse')}
      </NavLink>
      <NavLink
        to="/topics/history"
        className={({ isActive }) => (isActive ? styles.activeTab : '')}
      >
        <Icon name="clock" size={17} />
        {t('conversationHistory')}
      </NavLink>
    </nav>
  );
};
