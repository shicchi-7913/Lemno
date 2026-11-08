import { useRef, useState } from 'react';

import { desktopAvailable, type StudyKind } from '@/shared/api';
import { type t, useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';
import { Input } from '@/shared/ui/Input';
import { useToast } from '@/shared/ui/Toast';
import { ToggleButton } from '@/shared/ui/ToggleButton';

import {
  useVocabulary,
  type VocabularyChange,
  VocabularyDialog,
  type VocabularyDialogState,
} from '../../manage-vocabulary';
import { filterStudyItems, memoryStatus, type Status, statuses } from '../model';

import { StudyItemList } from './study-item-list';

import styles from './study-library.module.scss';

interface StudyLibraryProps {
  kind: StudyKind;
  eyebrow: string;
  headingKey: Parameters<typeof t>[0];
  subtitle: Parameters<typeof t>[0];
  addLabel: Parameters<typeof t>[0];
  reviewTitle: Parameters<typeof t>[0];
  reviewBody: Parameters<typeof t>[0];
  reviewLabel: Parameters<typeof t>[0];
  desktopNotice: Parameters<typeof t>[0];
  onReview: () => void;
  onOpenLibrary: (kind: StudyKind) => void;
}

export const StudyLibrary = ({
  kind,
  eyebrow,
  headingKey,
  subtitle,
  addLabel,
  reviewTitle,
  reviewBody,
  reviewLabel,
  desktopNotice,
  onReview,
  onOpenLibrary,
}: StudyLibraryProps) => {
  const phrase = kind === 'phrase';
  const { t } = useI18n();
  const vocabulary = useVocabulary(kind);
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
    notify(
      t(
        change.kind === 'deleted'
          ? phrase
            ? 'phraseDeleted'
            : 'deleted'
          : change.created
            ? change.item.kind === 'phrase'
              ? 'phraseCreated'
              : 'created'
            : 'updated',
      ),
    );
    if (change.kind === 'saved' && change.item.kind !== kind) {
      onOpenLibrary(change.item.kind);
    }
    // Rows can disappear after an edit or deletion, so use a stable focus target.
    requestAnimationFrame(() => addRef.current?.focus());
  }

  function resetFilters() {
    setQuery('');
    setStatus('all');
    searchRef.current?.focus();
  }

  const visible = filterStudyItems(items, query, status);
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
          <div className={styles.eyebrow}>{eyebrow}</div>
          <Heading as="h1">{t(headingKey)}</Heading>
          <p>{t(subtitle)}</p>
        </div>
        <Button
          ref={addRef}
          id={`add-${kind}`}
          type="button"
          variant="solid"
          tone="brand"
          disabled={!desktopAvailable || loading || failed}
          title={desktopAvailable ? undefined : t(desktopNotice)}
          onClick={() => setDialog({ mode: 'create', kind })}
          leftIcon={<Icon name="plus" />}
        >
          {t(addLabel)}
        </Button>
      </section>
      {!desktopAvailable && <p className={styles.previewNotice}>{t(desktopNotice)}</p>}
      <section className={styles.reviewBanner} aria-label={t(reviewTitle)}>
        <div>
          <h2>{t(reviewTitle)}</h2>
          <p>{t(reviewBody)}</p>
        </div>
        <Button
          variant="solid"
          tone="brand"
          className={styles.reviewButton}
          size="xs"
          type="button"
          disabled={!desktopAvailable || loading || failed || items.length === 0}
          onClick={onReview}
          leftIcon={<Icon name="repeat" size={16} />}
          rightIcon={<Icon name="arrow" size={16} />}
        >
          <span>{t(reviewLabel)}</span>
        </Button>
      </section>
      <section className={styles.statistics} aria-label={t(headingKey)}>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        {(['saved', 'reviewing', 'mastered', 'used'] as const).map((key) => (
          <div className={styles.statCard} key={key}>
            <h2>{t(key)}</h2>
            <p>
              <strong data-stat={key}>{loading || failed ? '—' : stats[key]}</strong>
              <span>{t('itemUnit')}</span>
            </p>
          </div>
        ))}
      </section>
      <section className={styles.libraryPanel} aria-label={t(headingKey)}>
        <div className={styles.listToolbar}>
          <div className={styles.searchField}>
            <Icon name="search" size={16} />
            <Input
              variant="plain"
              ref={searchRef}
              id={`${kind}-search`}
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
        <StudyItemList
          kind={kind}
          onReview={onReview}
          items={visible}
          total={items.length}
          loading={loading}
          failed={failed}
          onReload={() => {
            void vocabulary.refetch();
          }}
          onReset={resetFilters}
          onAdd={() => setDialog({ mode: 'create', kind })}
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
