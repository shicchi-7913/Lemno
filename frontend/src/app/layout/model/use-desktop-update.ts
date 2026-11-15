import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { useEffect, useRef, useState } from 'react';

import { desktopAvailable } from '@/shared/api';

export function useDesktopUpdate() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [updating, setUpdating] = useState(false);
  const installing = useRef(false);
  const installed = useRef(false);

  useEffect(() => {
    if (!desktopAvailable) return;

    let disposed = false;
    let checking = false;
    let pending: Update | null = null;

    async function checkForUpdate() {
      if (checking || pending) return;
      checking = true;
      try {
        const available = await check({ timeout: 10_000 });
        if (disposed) {
          await available?.close();
          return;
        }
        pending = available;
        setUpdate(available);
      } catch {
        // An offline or unavailable update server must not interrupt the workspace.
      } finally {
        checking = false;
      }
    }

    void checkForUpdate();
    window.addEventListener('focus', checkForUpdate);
    return () => {
      disposed = true;
      window.removeEventListener('focus', checkForUpdate);
      if (pending && !installing.current && !installed.current) {
        void pending.close().catch(() => {});
      }
    };
  }, []);

  async function installUpdate() {
    if (!update || installing.current) return;
    installing.current = true;
    setUpdating(true);
    try {
      if (!installed.current) {
        await update.downloadAndInstall();
        installed.current = true;
      }
      await relaunch();
    } finally {
      installing.current = false;
      setUpdating(false);
    }
  }

  return { available: update !== null, updating, installUpdate };
}
