import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { desktopAvailable, mcpApi } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { useLearningLanguage } from '@/shared/learning-language';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { HeadingGroup } from '@/shared/ui/HeadingGroup';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { Label } from '@/shared/ui/Label';
import { Surface } from '@/shared/ui/Surface';

import styles from './integration.module.scss';

const toolName = 'record_conversation';

export const McpSettings = () => {
  const { t } = useI18n();
  const { language } = useLearningLanguage();
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ['codex-status'],
    queryFn: mcpApi.status,
    enabled: desktopAvailable,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
  });
  const connection = useMutation({
    mutationFn: mcpApi.connect,
    onSuccess: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['codex-status'] });
      queryClient.setQueryData(['codex-status'], data);
    },
  });
  const ready = status.data?.current ?? false;
  const errorMessages = {
    mcpConnectionFailed: 'mcpConnectError',
    codexConfigReadError: 'mcpConfigReadError',
    codexConfigWriteError: 'mcpConfigWriteError',
    codexConfigInvalid: 'mcpConfigInvalid',
    codexConfigChanged: 'mcpConfigChanged',
  } as const;
  const error = connection.error ?? status.error;
  const errorCode = typeof error === 'string' ? error : '';
  const errorMessage = errorMessages[errorCode as keyof typeof errorMessages] ?? 'mcpConnectError';

  return (
    <div className={styles.page}>
      <HeadingGroup
        as="h1"
        className={styles.heading}
        eyebrow={t('mcpEyebrow')}
        title={t('integration')}
        description={t('mcpDescription')}
        descriptionSize="sm"
      />
      <Surface as="section" className={styles.connection}>
        <div className={styles.connectionHeader}>
          <div className={styles.connectionTitle}>
            <IconBadge name="spark" size={52} className={styles.symbol} />
            <div>
              <Heading as="h2" size="md">
                {t('mcpServerTitle')}
              </Heading>
              <p>{t('mcpConnectionDescription')}</p>
            </div>
          </div>
          <Label tone={ready ? 'success' : 'neutral'}>
            {t(
              ready
                ? 'mcpConfigured'
                : status.data?.registered
                  ? 'mcpNeedsUpdate'
                  : 'mcpNotConfigured',
            )}
          </Label>
        </div>
        <p className={styles.body}>{t('mcpServerDescription')}</p>
        <div className={styles.connectionFooter}>
          <span className={styles.language}>
            <Icon name="globe" size={16} />
            {t('mcpLanguage', {
              language: t(language === 'en' ? 'targetEnglish' : 'languageJapanese'),
            })}
          </span>
          <Button
            disabled={
              !desktopAvailable || status.isPending || status.isError || connection.isPending
            }
            leftIcon={<Icon name={ready ? 'check' : 'plus'} size={16} />}
            onClick={() => connection.mutate()}
          >
            {t(
              connection.isPending
                ? 'mcpConnecting'
                : status.data?.registered
                  ? 'mcpUpdateConnection'
                  : 'mcpConnect',
            )}
          </Button>
        </div>
        <div aria-live="polite" aria-busy={connection.isPending}>
          {!desktopAvailable && (
            <Alert type="info" className={styles.feedback}>
              {t('mcpDesktopOnly')}
            </Alert>
          )}
          {desktopAvailable && status.isPending && (
            <p role="status" className={styles.body}>
              {t('mcpLoading')}
            </p>
          )}
          {ready && !connection.isPending && !error && (
            <Alert type="success" className={styles.feedback}>
              {t('mcpConnectedHint')}
            </Alert>
          )}
          {status.data?.registered && !ready && !connection.isPending && !error && (
            <Alert type="warn" className={styles.feedback}>
              {t('mcpUpdateHint')}
            </Alert>
          )}
          {error && (
            <Alert type="error" className={styles.feedback}>
              {t(errorMessage)}
              {status.isError && (
                <Button variant="ghost" onClick={() => void status.refetch()}>
                  {t('retry')}
                </Button>
              )}
            </Alert>
          )}
        </div>
      </Surface>
      <Surface as="section" className={styles.tools}>
        <HeadingGroup
          as="h2"
          size="md"
          title={t('mcpToolsTitle')}
          description={t('mcpToolsDescription')}
        />
        <ul className={styles.toolList}>
          <li>
            <div className={styles.toolHeading}>
              <code>{toolName}</code>
              <Label tone="brand">{t('mcpWrite')}</Label>
            </div>
            <p>{t('mcpToolRecord')}</p>
          </li>
        </ul>
      </Surface>
    </div>
  );
};
