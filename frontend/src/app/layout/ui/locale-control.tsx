import styles from './locale-control.module.scss';
import { useState } from 'react';
import { changeLocale, useI18n } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/Icon';
import { FormLabel } from '../../../shared/ui/FormLabel';
import { Select } from '../../../shared/ui/Select';

export const LocaleControl = ({ onError }: { onError: (message: string) => void }) => {
  const { t, locale } = useI18n();
  const [savingLocale, setSavingLocale] = useState(false);

  async function selectLocale(value: string) {
    setSavingLocale(true);
    try {
      await changeLocale(value);
    } catch {
      onError(t('localeError'));
    } finally {
      setSavingLocale(false);
    }
  }

  return (
    <div className={styles.localeControl}>
      <Icon name="globe" size={15} />
      <FormLabel size="2xs" className={styles.localeLabel} htmlFor="locale">
        {t('locale')}
      </FormLabel>
      <Select
        className={styles.localeSelect}
        id="locale"
        aria-label={t('locale')}
        value={locale}
        disabled={savingLocale}
        onChange={(event) => {
          void selectLocale(event.currentTarget.value);
        }}
      >
        <option value="ja">{t('languageJapanese')}</option>
        <option value="en">{t('languageEnglish')}</option>
      </Select>
    </div>
  );
};
