import { useNavigate } from 'react-router';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';

import styles from './home.module.scss';

export const Hero = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <section className={styles.hero} aria-labelledby="home-practice-title">
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>
          <Icon name="spark" size={14} />
          {t('homePracticeEyebrow')}
        </p>
        <Heading as="h2" size="2xl" id="home-practice-title" className={styles.heroTitle}>
          {t('homeHeroTitleTop')}
          <br />
          {t('homeHeroTitleBottom')}
        </Heading>
        <p className={styles.heroDescription}>
          {t('homeHeroBodyTop')}
          <br />
          {t('homeHeroBodyBottom')}
        </p>
        <Button
          className={styles.heroAction}
          variant="outline"
          onClick={() => navigate('/topics')}
          rightIcon={<Icon name="arrow" size={16} />}
        >
          {t('homeStartConversation')}
        </Button>
      </div>
      <div className={styles.heroIllustration} aria-hidden="true">
        <span className={styles.orbit} />
        <span className={styles.orbitInner} />
        {/* Learning content stays in the target language. */}
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <span className={styles.hello}>
          Hello! <Icon name="sun" size={15} />
        </span>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <span className={styles.question}>How was your day?</span>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <span className={styles.answer}>
          I'm doing great <Icon name="sun" size={13} />
        </span>
      </div>
    </section>
  );
};
