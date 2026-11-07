import styles from './topbar.module.scss';
import { useLocation } from 'react-router';
import { useI18n } from '../../../shared/i18n';
import { Avatar } from '../../../shared/ui/Avatar';
import { Icon } from '../../../shared/ui/Icon';
import { useToast } from '../../../shared/ui/Toast';
import { LocaleControl } from './locale-control';
import { getCurrentNavigation } from '../model';

export const Topbar = () => {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const notify = useToast();
  const currentPage = getCurrentNavigation(pathname);

  return (
    <>
      <div className={styles.breadcrumbs}>
        <span>{t('workspace')}</span>
        {currentPage && (
          <>
            <Icon name="chevron" />
            <strong>{t(currentPage.label)}</strong>
          </>
        )}
      </div>
      <div className={styles.topbarRight}>
        <LocaleControl onError={notify} />
        <Avatar aria-hidden="true">S</Avatar>
      </div>
    </>
  );
};
