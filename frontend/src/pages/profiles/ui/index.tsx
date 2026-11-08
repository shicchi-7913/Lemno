import { useI18n } from '@/shared/i18n';
import {
  changeLearningLanguage,
  learningLanguages,
  useLearningLanguage,
} from '@/shared/learning-language';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';
import { useToast } from '@/shared/ui/Toast';

import { LanguageCard } from './language-card';

import styles from './profiles.module.scss';

export const ProfilesPage = () => {
  const { t } = useI18n();
  const { language, saving } = useLearningLanguage();
  const notify = useToast();

  return (
    <div className={styles.page}>
      <section className={styles.heading}>
        <p className={styles.eyebrow}>{t('profilesEyebrow')}</p>
        <Heading as="h1">{t('profiles')}</Heading>
        <p className={styles.description}>{t('profilesDescription')}</p>
      </section>
      <div className={styles.grid} role="group" aria-label={t('learningLanguage')}>
        {learningLanguages.map((item) => (
          <LanguageCard
            key={item.code}
            flag={item.flag}
            title={t(item.title)}
            name={t(item.name)}
            selected={item.code === language}
            action={
              <Button
                variant={item.code === language ? 'outline' : 'solid'}
                disabled={saving || item.code === language}
                rightIcon={<Icon name={item.code === language ? 'check' : 'arrow'} size={15} />}
                onClick={async () => {
                  try {
                    await changeLearningLanguage(item.code);
                  } catch {
                    notify(t('learningLanguageError'));
                  }
                }}
              >
                {t(item.code === language ? 'languageSelected' : 'learnThisLanguage')}
              </Button>
            }
          />
        ))}
      </div>
      <p className={styles.note}>
        <Icon name="info" size={17} />
        {t('profilesLanguageNote')}
      </p>
    </div>
  );
};
