import { desktopAvailable, type StudyKind, type Vocabulary } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { Italic } from '@/shared/ui/Italic';
import { Label } from '@/shared/ui/Label';
import { Spinner } from '@/shared/ui/Spinner';

import { memoryStatus } from '../model';

import styles from './study-item-list.module.scss';

const memoryLabelTones = {
  learning: 'warning',
  consolidating: 'info',
  mastered: 'success',
} as const;

interface StudyItemListProps {
  kind: StudyKind;
  onReview: () => void;
  items: Vocabulary[];
  total: number;
  loading: boolean;
  failed: boolean;
  onReload: () => void;
  onReset: () => void;
  onAdd: () => void;
  onEdit: (item: Vocabulary) => void;
  onDelete: (item: Vocabulary) => void;
}

export const StudyItemList = ({
  kind,
  onReview,
  items,
  total,
  loading,
  failed,
  onReload,
  onReset,
  onAdd,
  onEdit,
  onDelete,
}: StudyItemListProps) => {
  const { t } = useI18n();
  const phrase = kind === 'phrase';

  return (
    <>
      <div aria-busy={loading}>
        {loading ? (
          <div className={styles.emptyState}>
            <Spinner />
            <p role="status">{t(phrase ? 'phraseLoading' : 'loading')}</p>
          </div>
        ) : failed ? (
          <div className={styles.emptyState}>
            <p role="alert">{t(phrase ? 'phraseLoadError' : 'loadError')}</p>
            <Button variant="outline" tone="neutral" type="button" onClick={onReload}>
              {t('retry')}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <IconBadge
              name={total ? 'search' : 'book'}
              size={54}
              tone="success"
              className={styles.emptySymbol}
            />
            <Heading as="h2" size="lg">
              {t(
                total
                  ? phrase
                    ? 'phraseNoResults'
                    : 'noResults'
                  : phrase
                    ? 'phraseEmptyTitle'
                    : 'emptyTitle',
              )}
            </Heading>
            <p>{t(total ? 'noResultsBody' : phrase ? 'phraseEmptyBody' : 'emptyBody')}</p>
            <Button
              variant={total ? 'outline' : 'solid'}
              tone={total ? 'neutral' : 'brand'}
              type="button"
              disabled={!total && !desktopAvailable}
              onClick={total ? onReset : onAdd}
              leftIcon={!total && <Icon name="plus" />}
            >
              {t(total ? 'reset' : phrase ? 'phraseAdd' : 'add')}
            </Button>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table>
              <thead>
                <tr>
                  <th scope="col">{t(phrase ? 'phraseMeaning' : 'wordMeaning')}</th>
                  <th scope="col">{t('memory')}</th>
                  <th scope="col">{t('conversation')}</th>
                  <th scope="col">{t('reviews')}</th>
                  <th scope="col">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong className={styles.wordText}>{item.text}</strong>
                      <p className={styles.wordMeaning}>{item.explanation}</p>
                      {item.exampleText && <Italic lang="en">{item.exampleText}</Italic>}
                    </td>
                    <td>
                      <Label tone={memoryLabelTones[memoryStatus(item)]}>
                        {t(memoryStatus(item))}
                      </Label>
                    </td>
                    <td className={styles.usageCount}>{t('times', { count: item.usageCount })}</td>
                    <td className={styles.reviewCount}>
                      {t('times', { count: item.reviewCount })}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <Button
                          variant="ghost"
                          tone="neutral"
                          iconOnly
                          type="button"
                          aria-label={t('editItem', { word: item.text })}
                          title={t('edit')}
                          onClick={() => onEdit(item)}
                          leftIcon={<Icon name="edit" size={16} />}
                        />
                        <Button
                          variant="ghost"
                          tone="danger"
                          iconOnly
                          type="button"
                          aria-label={t('deleteItem', { word: item.text })}
                          title={t('delete')}
                          onClick={() => onDelete(item)}
                          leftIcon={<Icon name="trash" size={16} />}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className={styles.listFooter} role="status" aria-live="polite">
        <span>{!loading && !failed && t('showingItems', { count: items.length })}</span>
        {!loading && !failed && total > 0 && (
          <Button
            variant="ghost"
            tone="brand"
            type="button"
            size="xs"
            onClick={onReview}
            rightIcon={<Icon name="arrow" size={16} />}
          >
            {t(phrase ? 'phraseReview' : 'review')}
          </Button>
        )}
      </div>
    </>
  );
};
