import { useRef, useState } from 'react';

import {
  useVocabulary,
  type VocabularyChange,
  VocabularyDialog,
  type VocabularyDialogState,
} from '../../../features/manage-vocabulary';
import { desktopAvailable } from '../../../shared/api';
import { useI18n } from '../../../shared/i18n';
import { Button } from '../../../shared/ui/Button';
import { Heading } from '../../../shared/ui/Heading';
import { Icon } from '../../../shared/ui/Icon';
import { Input } from '../../../shared/ui/Input';
import { useToast } from '../../../shared/ui/Toast';
import { ToggleButton } from '../../../shared/ui/ToggleButton';
import { filterVocabulary, memoryStatus, type Status, statuses } from '../model';

import { VocabularyList } from './vocabulary-list';

import styles from './vocabulary.module.scss';

export const VocabularyPage = () => {
  const { t } = useI18n();
  const vocabulary = useVocabulary();
  const items = vocabulary.data ?? [];
  const loading = vocabulary.isLoading;
  // A failed background refresh should not hide the cached vocabulary.
  const failed = vocabulary.isError && vocabulary.data === undefined;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [dialog, setDialog] = useState<VocabularyDialogState | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const notify = useToast();

  function complete(change: VocabularyChange) {
    setDialog(null);
    if (change.kind === 'saved' && change.created) {
      setQuery('');
      setStatus('all');
    }
    notify(t(change.kind === 'deleted' ? 'deleted' : change.created ? 'created' : 'updated'));
    // Rows can disappear after an edit or deletion, so use a stable focus target.
    requestAnimationFrame(() => addRef.current?.focus());
  }

  function resetFilters() {
    setQuery('');
    setStatus('all');
    searchRef.current?.focus();
  }

  const visible = filterVocabulary(items, query, status);
  const mastered = items.filter((item) => memoryStatus(item) === 'mastered').length;
  const stats = {
    saved: items.length,
    reviewing: items.length - mastered,
    mastered,
    used: items.filter((item) => item.usageCount > 0).length,
  };

  return (
    <>
      <section className={styles.pageHeading}>
        <div>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <div className={styles.eyebrow}>— &nbsp; YOUR VOCABULARY</div>
          <Heading as="h1">{t('title')}</Heading>
          <p>{t('subtitle')}</p>
        </div>
        <Button
          ref={addRef}
          id="add-word"
          type="button"
          variant="solid"
          tone="brand"
          disabled={!desktopAvailable || loading || failed}
          title={desktopAvailable ? undefined : t('desktopOnly')}
          onClick={() => setDialog({ mode: 'create' })}
        >
          <Icon name="plus" />
          {t('add')}
        </Button>
      </section>
      {!desktopAvailable && <p className={styles.previewNotice}>{t('desktopOnly')}</p>}
      <section className={styles.reviewBanner} aria-label={t('reviewTitle')}>
        <div>
          <h2>{t('reviewTitle')}</h2>
          <p>{t('reviewBody')}</p>
        </div>
        <Button
          variant="solid"
          tone="brand"
          className={styles.reviewButton}
          size="xs"
          type="button"
          disabled
          title={t('soon')}
        >
          <Icon name="repeat" size={16} />
          <span>{t('review')}</span>
          <span className={styles.comingSoon}>{t('soon')}</span>
        </Button>
      </section>
      <section className={styles.statistics} aria-label={t('title')}>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        {(['saved', 'reviewing', 'mastered', 'used'] as const).map((key) => (
          <div className={styles.statCard} key={key}>
            <h2>{t(key)}</h2>
            <p>
              <strong data-stat={key}>{loading || failed ? '—' : stats[key]}</strong>
              <span>{t('itemCount', { count: 0 }).replace(/^0\s*/, '')}</span>
            </p>
          </div>
        ))}
      </section>
      <section className={styles.vocabularyPanel} aria-label={t('title')}>
        <div className={styles.listToolbar}>
          <div className={styles.searchField}>
            <Icon name="search" size={16} />
            <Input
              variant="plain"
              ref={searchRef}
              id="vocabulary-search"
              type="search"
              placeholder={t('search')}
              aria-label={t('searchLabel')}
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </div>
          <div className={styles.filters} role="group" aria-label={t('memory')}>
            {statuses.map((value) => (
              <ToggleButton key={value} pressed={status === value} onClick={() => setStatus(value)}>
                {t(value)}
              </ToggleButton>
            ))}
          </div>
        </div>
        <VocabularyList
          items={visible}
          total={items.length}
          loading={loading}
          failed={failed}
          onReload={() => {
            void vocabulary.refetch();
          }}
          onReset={resetFilters}
          onAdd={() => setDialog({ mode: 'create' })}
          onEdit={(item) => setDialog({ mode: 'edit', item })}
          onDelete={(item) => setDialog({ mode: 'delete', item })}
        />
      </section>
      {dialog && (
        <VocabularyDialog state={dialog} onDismiss={() => setDialog(null)} onComplete={complete} />
      )}
    </>
  );
};
