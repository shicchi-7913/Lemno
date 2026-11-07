import styles from './layout.module.scss';
import { Outlet } from 'react-router';
import { useI18n } from '../../../shared/i18n';
import { ToastProvider } from '../../../shared/ui/Toast';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export const WorkspaceLayout = () => {
  const { t } = useI18n();

  return (
    <ToastProvider>
      <aside className={styles.sidebar} aria-label={t('workspace')}>
        <Sidebar />
      </aside>
      <div className={styles.mainShell}>
        <header className={styles.header}>
          <Topbar />
        </header>
        <main className={styles.workspace}>
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  );
};
