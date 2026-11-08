import { type FormEvent, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { conversationApi, type ConversationInput, desktopAvailable } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { FormLabel } from '@/shared/ui/FormLabel';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';

import { useConversationMutation, useTopics } from '../../../features/conversation-workspace';
import { useVocabulary } from '../../../features/manage-vocabulary';

import styles from './recorder.module.scss';

const steps = [
  'conversationStepInput',
  'conversationStepConfirm',
  'conversationStepSaved',
] as const;

export const ConversationRecorderPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const topics = useTopics();
  const words = useVocabulary('word');
  const phrases = useVocabulary('phrase');
  const items = [...(words.data ?? []), ...(phrases.data ?? [])];
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<ConversationInput>(() => ({
    id: crypto.randomUUID(),
    topicId: params.get('topic'),
    ai: 'ChatGPT',
    durationMinutes: 15,
    notes: '',
    usedItemIds: [],
    learnedItems: [],
  }));
  const mutation = useConversationMutation(conversationApi.record);
  const submitting = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topic = topics.data?.find((value) => value.id === input.topicId);

  function moveTo(next: number) {
    setStep(next);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (const control of Array.from(
      event.currentTarget.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input[required], textarea[required]',
      ),
    )) {
      if (control.type !== 'number')
        control.setCustomValidity(control.value.trim() ? '' : t('requiredError'));
    }
    if (!event.currentTarget.reportValidity()) return;
    if (step === 0) {
      moveTo(1);
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    try {
      await mutation.mutateAsync(input);
      moveTo(2);
    } catch {
      /* Keep the confirmation and input available for retry. */
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div className={styles.contained}>
      <Button
        variant="ghost"
        tone="neutral"
        className={styles.backButton}
        disabled={mutation.isPending}
        leftIcon={<Icon name="back" size={15} />}
        onClick={() => (step === 1 ? moveTo(0) : navigate('/topics/history'))}
      >
        {t('conversationBack')}
      </Button>
      <section className={styles.pageHeading}>
        <div>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <div className={styles.eyebrow}>AFTER YOUR CONVERSATION</div>
          <Heading as="h1" ref={headingRef} tabIndex={-1}>
            {t('conversationRecordTitle')}
          </Heading>
          <p>{t('conversationRecordSubtitle')}</p>
        </div>
      </section>
      <div className={styles.recorder}>
        <ol className={styles.steps} aria-label={t('conversationRecordTitle')}>
          {steps.map((label, index) => (
            <li
              key={label}
              className={index <= step ? styles.currentStep : ''}
              aria-current={index === step ? 'step' : undefined}
            >
              <span>{index < step ? <Icon name="check" size={15} /> : index + 1}</span>
              {t(label)}
            </li>
          ))}
        </ol>
        {!desktopAvailable && <p className={styles.notice}>{t('conversationDesktopOnly')}</p>}
        {step === 2 ? (
          <section className={`${styles.panel} ${styles.success}`} aria-live="polite">
            <IconBadge name="check" size={48} iconScale={0.58} />
            <Heading as="h2">{t('conversationSaved')}</Heading>
            <p>{t('conversationSavedBody')}</p>
            <Button onClick={() => navigate(`/conversations/${input.id}`)}>
              {t('conversationViewRecord')}
              <Icon name="arrow" size={16} />
            </Button>
            <Button variant="ghost" onClick={() => navigate('/topics/history')}>
              {t('conversationHistory')}
            </Button>
          </section>
        ) : (
          <form
            onInput={(event) => {
              if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement
              )
                event.target.setCustomValidity('');
            }}
            className={`${styles.panel} ${styles.recordForm}`}
            onSubmit={submit}
            aria-busy={mutation.isPending}
          >
            <fieldset className={styles.controls} disabled={mutation.isPending}>
              {step === 0 ? (
                <>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <FormLabel htmlFor="record-topic">{t('topics')}</FormLabel>
                      <Select
                        id="record-topic"
                        size="sm"
                        value={input.topicId ?? ''}
                        onChange={(event) =>
                          setInput({ ...input, topicId: event.target.value || null })
                        }
                      >
                        <option value="">{t('conversationNoTopic')}</option>
                        {topics.data?.map((value) => (
                          <option value={value.id} key={value.id}>
                            {value.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className={styles.field}>
                      <FormLabel htmlFor="record-ai">{t('conversationAI')}</FormLabel>
                      <Select
                        id="record-ai"
                        size="sm"
                        value={input.ai}
                        onChange={(event) => setInput({ ...input, ai: event.target.value })}
                      >
                        {/* eslint-disable-next-line i18next/no-literal-string */}
                        <option value="ChatGPT">ChatGPT</option>
                        {/* eslint-disable-next-line i18next/no-literal-string */}
                        <option value="Claude Desktop">Claude Desktop</option>
                      </Select>
                    </div>
                    <div className={styles.field}>
                      <FormLabel htmlFor="record-duration">
                        {t('conversationDurationLabel')}
                      </FormLabel>
                      <Input
                        id="record-duration"
                        type="number"
                        min={1}
                        max={1440}
                        step={1}
                        size="sm"
                        required
                        value={Number.isNaN(input.durationMinutes) ? '' : input.durationMinutes}
                        onChange={(event) =>
                          setInput({ ...input, durationMinutes: event.target.valueAsNumber })
                        }
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <FormLabel htmlFor="record-notes">{t('conversationNotesLabel')}</FormLabel>
                    <Textarea
                      id="record-notes"
                      name="notes"
                      size="sm"
                      rows={8}
                      maxLength={20000}
                      required
                      placeholder={t('conversationNotesPlaceholder')}
                      value={input.notes}
                      onChange={(event) => {
                        event.target.setCustomValidity('');
                        setInput({ ...input, notes: event.target.value });
                      }}
                    />
                  </div>
                  {topics.isError && (
                    <p className={styles.error} role="alert">
                      {t('conversationTopicsError')}
                      <Button type="button" variant="ghost" onClick={() => void topics.refetch()}>
                        {t('retry')}
                      </Button>
                    </p>
                  )}
                  <p className={styles.info}>
                    <Icon name="info" size={17} />
                    <span>{t('conversationManualNote')}</span>
                  </p>
                </>
              ) : (
                <>
                  <Heading as="h2" size="md" className={styles.sectionHeading}>
                    {t('conversationConfirmTitle')}
                  </Heading>
                  <dl className={styles.summary}>
                    <div>
                      <dt>{t('topics')}</dt>
                      <dd>{topic?.title ?? t('conversationUntitled')}</dd>
                    </div>
                    <div>
                      <dt>{t('conversationAI')}</dt>
                      <dd>{input.ai}</dd>
                    </div>
                    <div>
                      <dt>{t('conversationDurationLabel')}</dt>
                      <dd>{t('conversationMinutes', { count: input.durationMinutes })}</dd>
                    </div>
                  </dl>
                  <p className={styles.noteContent}>{input.notes}</p>
                  <Heading as="h2" size="md" className={styles.sectionHeading}>
                    {t('conversationUsedExpressions')}
                  </Heading>
                  <p className={styles.muted}>{t('conversationUsedHint')}</p>
                  {words.isError || phrases.isError ? (
                    <div className={styles.error} role="alert">
                      <p>{t('conversationExpressionsError')}</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void words.refetch();
                          void phrases.refetch();
                        }}
                      >
                        {t('retry')}
                      </Button>
                    </div>
                  ) : words.isLoading || phrases.isLoading ? (
                    <p className={styles.muted}>{t('conversationLoading')}</p>
                  ) : items.length === 0 ? (
                    <p className={styles.muted}>{t('conversationNoSavedExpressions')}</p>
                  ) : (
                    <div className={styles.expressionChoices}>
                      {items.map((item) => (
                        <label key={item.id}>
                          <input
                            type="checkbox"
                            disabled={
                              input.usedItemIds.length >= 100 &&
                              !input.usedItemIds.includes(item.id)
                            }
                            checked={input.usedItemIds.includes(item.id)}
                            onChange={(event) =>
                              setInput({
                                ...input,
                                usedItemIds: event.target.checked
                                  ? [...input.usedItemIds, item.id]
                                  : input.usedItemIds.filter((id) => id !== item.id),
                              })
                            }
                          />
                          <span>
                            {item.text}
                            <small>{item.explanation}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <Heading as="h2" size="md" className={styles.sectionHeading}>
                    {t('conversationLearnedExpressions')}
                  </Heading>
                  <p className={styles.muted}>{t('conversationLearnedHint')}</p>
                  {input.learnedItems.map((item, index) => (
                    <div className={styles.learnedRow} key={index}>
                      <Input
                        required
                        maxLength={200}
                        placeholder={t('studyText')}
                        aria-label={t('studyText')}
                        value={item.text}
                        onChange={(event) =>
                          setInput({
                            ...input,
                            learnedItems: input.learnedItems.map((value, i) =>
                              i === index ? { ...value, text: event.target.value } : value,
                            ),
                          })
                        }
                      />
                      <Input
                        required
                        maxLength={2000}
                        placeholder={t('studyMeaning')}
                        aria-label={t('studyMeaning')}
                        value={item.explanation}
                        onChange={(event) =>
                          setInput({
                            ...input,
                            learnedItems: input.learnedItems.map((value, i) =>
                              i === index ? { ...value, explanation: event.target.value } : value,
                            ),
                          })
                        }
                      />
                      <Select
                        aria-label={t('studyKind')}
                        value={item.kind}
                        onChange={(event) =>
                          setInput({
                            ...input,
                            learnedItems: input.learnedItems.map((value, i) =>
                              i === index
                                ? { ...value, kind: event.target.value as 'word' | 'phrase' }
                                : value,
                            ),
                          })
                        }
                      >
                        <option value="word">{t('vocabulary')}</option>
                        <option value="phrase">{t('phrases')}</option>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        iconOnly
                        aria-label={t('deleteItem', { word: item.text })}
                        onClick={() =>
                          setInput({
                            ...input,
                            learnedItems: input.learnedItems.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <Icon name="close" size={16} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={input.learnedItems.length >= 100}
                    leftIcon={<Icon name="plus" size={16} />}
                    onClick={() =>
                      setInput({
                        ...input,
                        learnedItems: [
                          ...input.learnedItems,
                          { text: '', explanation: '', exampleText: '', kind: 'word' },
                        ],
                      })
                    }
                  >
                    {t('conversationAddExpression')}
                  </Button>
                  {mutation.isError && (
                    <p className={styles.error} role="alert">
                      {t('conversationSaveError')}
                    </p>
                  )}
                </>
              )}
              <div className={styles.formActions}>
                {step === 1 && (
                  <Button type="button" variant="outline" onClick={() => moveTo(0)}>
                    {t('conversationEditInput')}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={!desktopAvailable || topics.isLoading || topics.isError}
                  rightIcon={<Icon name="arrow" size={16} />}
                >
                  {t(
                    mutation.isPending
                      ? 'saving'
                      : step === 0
                        ? 'conversationConfirm'
                        : 'conversationSave',
                  )}
                </Button>
              </div>
            </fieldset>
          </form>
        )}
      </div>
    </div>
  );
};
