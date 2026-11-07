import styles from './toast.module.scss';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const ToastContext = createContext<((message: string) => void) | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [notification, setNotification] = useState<{ message: string } | null>(null);
  const notify = useCallback((message: string) => setNotification({ message }), []);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className={styles.toast} role="status" aria-live="polite" hidden={!notification}>
        {notification?.message}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast must be used within ToastProvider');
  return notify;
}
