import { type SubmitEvent, useId, useRef, useState } from 'react';

import { errorCode, type StudyKind, type VocabularyInput } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { useFormValidation } from '@/shared/model/use-form-validation';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { FieldError } from '@/shared/ui/FieldError';
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
  const validation = useFormValidation();
  const fields = {
    text: validation.field('text'),
    explanation: validation.field('explanation'),
    exampleText: validation.field('exampleText'),
  };
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
    const value = control.value;
    setInput((previous) => ({ ...previous, [name]: value }));
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const normalized: VocabularyInput = {
      kind: input.kind,
      text: input.text.trim(),
      explanation: input.explanation.trim(),
      exampleText: input.exampleText.trim(),
    };
    if (!deleting && !validation.validate(event.currentTarget)) return;
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
      <form noValidate onInput={validation.onInput} onSubmit={submit} aria-busy={pending}>
        <fieldset className={styles.dialogControls} disabled={pending}>
          <div className={styles.dialogHeading}>
            <div>
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
                  {...fields.text.input}
                  ref={wordRef}
                  id={`${id}-text`}
                  maxLength={200}
                  value={input.text}
                  onChange={(event) => changeInput('text', event.currentTarget)}
                  placeholder={t('wordPlaceholder')}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
                <FieldError {...fields.text.error} />
              </div>
              <div className={styles.field}>
                <FormLabel htmlFor={`${id}-explanation`}>{t('studyMeaning')}</FormLabel>
                <Textarea
                  {...fields.explanation.input}
                  id={`${id}-explanation`}
                  maxLength={2000}
                  rows={1}
                  value={input.explanation}
                  onChange={(event) => changeInput('explanation', event.currentTarget)}
                  placeholder={t('studyMeaningPlaceholder')}
                  required
                />
                <FieldError {...fields.explanation.error} />
              </div>
              <div className={styles.field}>
                <FormLabel htmlFor={`${id}-example`}>{t('studyExample')}</FormLabel>
                <Textarea
                  {...fields.exampleText.input}
                  id={`${id}-example`}
                  maxLength={2000}
                  rows={1}
                  value={input.exampleText}
                  onChange={(event) => changeInput('exampleText', event.currentTarget)}
                  placeholder={t('studyExamplePlaceholder')}
                />
                <FieldError {...fields.exampleText.error} />
              </div>
              <div className={styles.field}>
                <FormLabel htmlFor={`${id}-kind`}>{t('studyKind')}</FormLabel>
                <Select
                  id={`${id}-kind`}
                  name="kind"
                  size="md"
                  value={input.kind}
                  options={[
                    { label: t('vocabulary'), value: 'word' },
                    { label: t('phrases'), value: 'phrase' },
                  ]}
                  disabled={state.mode === 'edit'}
                  onChange={(value) =>
                    setInput((previous) => ({ ...previous, kind: value as StudyKind }))
                  }
                />
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
