import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { useI18n } from '@/shared/i18n';
import {
  changeLearningLanguage,
  learningLanguages,
  useLearningLanguage,
} from '@/shared/learning-language';
import { Icon } from '@/shared/ui/Icon';
import { useToast } from '@/shared/ui/Toast';

import styles from './sidebar.module.scss';

export const LanguageSwitcher = () => {
  const { t } = useI18n();
  const { language, saving } = useLearningLanguage();
  const current = learningLanguages.find((item) => item.code === language)!;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const notify = useToast();

  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target)) {
        detailsRef.current!.open = false;
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        detailsRef.current!.open = false;
        summaryRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <details
      ref={detailsRef}
      className={styles.profileSwitcher}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary ref={summaryRef} className={styles.profileCard} aria-label={t('learningLanguage')}>
        <span className={styles.profileFlag} aria-hidden="true">
          {current.flag}
        </span>
        <strong>{t(current.title)}</strong>
        <span className={styles.profileChevron}>
          <Icon name="down" size={13} />
        </span>
      </summary>
      <div className={styles.profileMenu}>
        <div role="group" aria-label={t('learningLanguage')}>
          {learningLanguages.map((item) => (
            <button
              key={item.code}
              type="button"
              className={styles.profileOption}
              aria-pressed={item.code === language}
              disabled={saving}
              onClick={async () => {
                try {
                  await changeLearningLanguage(item.code);
                  detailsRef.current!.open = false;
                  summaryRef.current?.focus();
                } catch {
                  notify(t('learningLanguageError'));
                }
              }}
            >
              <span aria-hidden="true">{item.flag}</span>
              <span>{t(item.title)}</span>
              {item.code === language && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
        <Link
          to="/profiles"
          className={styles.profileSettings}
          onClick={() => {
            detailsRef.current!.open = false;
          }}
        >
          <Icon name="plus" size={14} />
          {t('changeLearningSettings')}
        </Link>
      </div>
    </details>
  );
};
