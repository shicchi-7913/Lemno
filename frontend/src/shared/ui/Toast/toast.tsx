import styles from './toast.module.scss';
import sizes from '../typography.module.scss';
import type { TextSize } from '../typography';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const ToastContext = createContext<((message: string) => void) | null>(null);

type ToastProviderProps = {
  children: ReactNode;
  size?: TextSize;
};

export const ToastProvider = ({ children, size = 'sm' }: ToastProviderProps) => {
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
      <div
        className={`${styles.toast} ${sizes[`size-${size}`]}`}
        role="status"
        aria-live="polite"
        hidden={!notification}
      >
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
