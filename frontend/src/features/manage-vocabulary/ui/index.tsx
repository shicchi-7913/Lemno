import { type FormEvent, useId, useRef, useState } from 'react';

import { errorCode, type StudyKind, type VocabularyInput } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { FormLabel } from '@/shared/ui/FormLabel';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';

import { useVocabularyMutation, type VocabularyChange, type VocabularyDialogState } from '../model';

import styles from './dialog.module.scss';

interface VocabularyDialogProps {
  state: VocabularyDialogState;
  onDismiss: () => void;
  onComplete: (change: VocabularyChange) => void;
}

export const VocabularyDialog = ({ state, onDismiss, onComplete }: VocabularyDialogProps) => {
  const { t } = useI18n();
  const item = state.mode === 'create' ? undefined : state.item;
  const deleting = state.mode === 'delete';
  const [input, setInput] = useState<VocabularyInput>(() => ({
    kind: state.mode === 'create' ? state.kind : state.item.kind,
    text: item?.text ?? '',
    explanation: item?.explanation ?? '',
    exampleText: item?.exampleText ?? '',
  }));
  const mutation = useVocabularyMutation();
  const pending = mutation.isPending;
  const error = mutation.isError ? t(deleting ? 'deleteError' : errorCode(mutation.error)) : '';
  const submitting = useRef(false);
  const wordRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  function changeInput(
    name: keyof VocabularyInput,
    control: HTMLInputElement | HTMLTextAreaElement,
  ) {
    control.setCustomValidity('');
    const value = control.value;
    setInput((previous) => ({ ...previous, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const normalized: VocabularyInput = {
      kind: input.kind,
      text: input.text.trim(),
      explanation: input.explanation.trim(),
      exampleText: input.exampleText.trim(),
    };
    if (!deleting) {
      const form = event.currentTarget;
      for (const name of ['text', 'explanation'] as const) {
        const control = form.elements.namedItem(name);
        if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
          control.setCustomValidity(normalized[name] ? '' : t('requiredError'));
        }
      }
      if (!form.reportValidity()) return;
    }
    submitting.current = true;
    let change: VocabularyChange;
    try {
      change = await mutation.mutateAsync(
        state.mode === 'delete'
          ? { mode: 'delete', id: state.item.id, kind: state.item.kind }
          : state.mode === 'edit'
            ? { mode: 'edit', id: state.item.id, input: normalized }
            : { mode: 'create', input: normalized },
      );
    } catch {
      return;
    } finally {
      submitting.current = false;
    }
    onComplete(change);
  }

  return (
    <Modal
      className={styles.studyDialog}
      titleId={`${id}-title`}
      descriptionId={`${id}-description`}
      pending={pending}
      onDismiss={onDismiss}
      initialFocusRef={deleting ? cancelRef : wordRef}
    >
      <form onSubmit={submit} aria-busy={pending}>
        <fieldset className={styles.dialogControls} disabled={pending}>
          <div className={styles.dialogHeading}>
            <div>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <p className={styles.eyebrow}>STUDY LIBRARY</p>
              <Heading as="h2" id={`${id}-title`} className={styles.dialogTitle}>
                {t(deleting ? 'studyDeleteTitle' : item ? 'studyEditTitle' : 'studyCreateTitle')}
              </Heading>
            </div>
            <Button
              className={styles.closeButton}
              variant="ghost"
              tone="neutral"
              iconOnly
              type="button"
              aria-label={t('close')}
              onClick={onDismiss}
              leftIcon={<Icon name="close" size={18} />}
            />
          </div>
          {deleting ? (
            <p id={`${id}-description`} className={styles.dialogDescription}>
              {t('studyDeleteBody', { word: state.item.text })}
            </p>
          ) : (
            <div className={styles.fields}>
              <div className={styles.field}>
                <FormLabel htmlFor={`${id}-text`}>{t('studyText')}</FormLabel>
                <Input
                  ref={wordRef}
                  id={`${id}-text`}
                  name="text"
                  maxLength={200}
                  value={input.text}
                  onChange={(event) => changeInput('text', event.currentTarget)}
                  placeholder={t('wordPlaceholder')}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </div>
              <div className={styles.field}>
                <FormLabel htmlFor={`${id}-explanation`}>{t('studyMeaning')}</FormLabel>
                <Textarea
                  id={`${id}-explanation`}
                  name="explanation"
                  maxLength={2000}
                  rows={1}
                  value={input.explanation}
                  onChange={(event) => changeInput('explanation', event.currentTarget)}
                  placeholder={t('studyMeaningPlaceholder')}
                  required
                />
              </div>
              <div className={styles.field}>
                <FormLabel htmlFor={`${id}-example`}>{t('studyExample')}</FormLabel>
                <Textarea
                  id={`${id}-example`}
                  name="exampleText"
                  maxLength={2000}
                  rows={1}
                  value={input.exampleText}
                  onChange={(event) => changeInput('exampleText', event.currentTarget)}
                  placeholder={t('studyExamplePlaceholder')}
                />
              </div>
              <div className={styles.field}>
                <FormLabel htmlFor={`${id}-kind`}>{t('studyKind')}</FormLabel>
                <Select
                  id={`${id}-kind`}
                  name="kind"
                  size="md"
                  value={input.kind}
                  disabled={state.mode === 'edit'}
                  onChange={(event) =>
                    setInput((previous) => ({ ...previous, kind: event.target.value as StudyKind }))
                  }
                >
                  <option value="word">{t('vocabulary')}</option>
                  <option value="phrase">{t('phrases')}</option>
                </Select>
              </div>
              <div id={`${id}-description`} className={styles.languageNote}>
                <Alert type="info">{t('studyLanguageNote')}</Alert>
              </div>
            </div>
          )}
          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}
          <div className={styles.dialogActions}>
            <Button
              ref={cancelRef}
              variant="outline"
              tone="neutral"
              type="button"
              onClick={onDismiss}
            >
              {t('cancel')}
            </Button>
            <Button variant="solid" tone={deleting ? 'danger' : 'brand'} type="submit">
              {t(
                pending
                  ? deleting
                    ? 'deleting'
                    : 'saving'
                  : deleting
                    ? 'delete'
                    : item
                      ? 'update'
                      : 'studySave',
              )}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
};
