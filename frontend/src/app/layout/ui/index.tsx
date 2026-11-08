import { Outlet } from 'react-router';

import { useI18n } from '@/shared/i18n';
import { useLearningLanguage } from '@/shared/learning-language';
import { ToastProvider } from '@/shared/ui/Toast';

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

import styles from './layout.module.scss';

export const WorkspaceLayout = () => {
  const { t } = useI18n();
  const { language } = useLearningLanguage();

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
          <Outlet key={language} />
        </main>
      </div>
    </ToastProvider>
  );
};
