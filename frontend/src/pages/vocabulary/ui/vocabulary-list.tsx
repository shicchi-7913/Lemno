import { Button } from '../../../shared/ui/Button';
import styles from './vocabulary-list.module.scss';
import { desktopAvailable, type Vocabulary } from '../../../shared/api';
import { useI18n } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/Icon';
import { Label } from '../../../shared/ui/Label';
import { Spinner } from '../../../shared/ui/Spinner';
import { memoryStatus } from '../model';

const memoryLabelTones = {
  learning: 'warning',
  consolidating: 'info',
  mastered: 'success',
} as const;

interface VocabularyListProps {
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

export const VocabularyList = ({
  items,
  total,
  loading,
  failed,
  onReload,
  onReset,
  onAdd,
  onEdit,
  onDelete,
}: VocabularyListProps) => {
  const { t } = useI18n();

  return (
    <>
      <div aria-busy={loading}>
        {loading ? (
          <div className={styles.emptyState}>
            <Spinner />
            <p role="status">{t('loading')}</p>
          </div>
        ) : failed ? (
          <div className={styles.emptyState}>
            <p role="alert">{t('loadError')}</p>
            <Button variant="outline" tone="neutral" type="button" onClick={onReload}>
              {t('retry')}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptySymbol}>
              <Icon name={total ? 'search' : 'book'} />
            </span>
            <h2>{t(total ? 'noResults' : 'emptyTitle')}</h2>
            <p>{t(total ? 'noResultsBody' : 'emptyBody')}</p>
            <Button
              variant={total ? 'outline' : 'solid'}
              tone={total ? 'neutral' : 'brand'}
              type="button"
              disabled={!total && !desktopAvailable}
              onClick={total ? onReset : onAdd}
            >
              {!total && <Icon name="plus" />}
              {t(total ? 'reset' : 'add')}
            </Button>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('wordMeaning')}</th>
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
                      {item.exampleText && (
                        <p className={styles.wordExample} lang="en">
                          {item.exampleText}
                        </p>
                      )}
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
                        >
                          <Icon name="edit" />
                        </Button>
                        <Button
                          variant="ghost"
                          tone="danger"
                          iconOnly
                          type="button"
                          aria-label={t('deleteItem', { word: item.text })}
                          title={t('delete')}
                          onClick={() => onDelete(item)}
                        >
                          <Icon name="trash" />
                        </Button>
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
        {!loading && !failed && t('showing', { visible: items.length, total })}
      </div>
    </>
  );
};
