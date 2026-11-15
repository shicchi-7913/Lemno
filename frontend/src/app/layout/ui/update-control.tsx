import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Spinner } from '@/shared/ui/Spinner';

import { useDesktopUpdate } from '../model';

export const UpdateControl = ({ onError }: { onError: (message: string) => void }) => {
  const { t } = useI18n();
  const { available, updating, installUpdate } = useDesktopUpdate();

  if (!available) return null;

  const label = t(updating ? 'appUpdating' : 'appUpdateAvailable');

  return (
    <Button
      variant="ghost"
      iconOnly
      title={label}
      aria-label={label}
      aria-busy={updating}
      disabled={updating}
      onClick={() => {
        void installUpdate().catch(() => onError(t('appUpdateError')));
      }}
    >
      {updating ? <Spinner /> : <Icon name="download" size={18} />}
    </Button>
  );
};
