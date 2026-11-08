import { type FormEvent, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { conversationApi, type Topic, type TopicInput } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { FormLabel } from '@/shared/ui/FormLabel';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { useToast } from '@/shared/ui/Toast';

import { useConversationMutation } from '../../../features/conversation-workspace';
import { categories, categoryKeys, difficulties, difficultyKeys } from '../model';

import styles from './topics.module.scss';

interface Props {
  mode: 'create' | 'edit' | 'delete' | 'start';
  topic?: Topic;
  onDismiss: () => void;
  onComplete: () => void;
}

const textFields = [
  { name: 'title', label: 'topicTitle', limit: 200 },
  { name: 'scenario', label: 'topicScenario', limit: 2000 },
  { name: 'learnerRole', label: 'topicLearnerRole', limit: 200 },
  { name: 'aiRole', label: 'topicAiRole', limit: 200 },
  { name: 'objective', label: 'topicObjective', limit: 2000 },
] as const;

export const TopicDialog = ({ mode, topic, onDismiss, onComplete }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const notify = useToast();
  const id = useId();
  const firstRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const submitting = useRef(false);
  const [input, setInput] = useState<TopicInput>(() =>
    topic
      ? {
          category: topic.category,
          title: topic.title,
          scenario: topic.scenario,
          learnerRole: topic.learnerRole,
          aiRole: topic.aiRole,
          objective: topic.objective,
          difficulty: topic.difficulty,
        }
      : {
          category: 'daily',
          title: '',
          scenario: '',
          learnerRole: '',
          aiRole: '',
          objective: '',
          difficulty: 'beginner',
        },
  );
  const mutation = useConversationMutation(async (value: TopicInput) => {
    if (mode === 'delete' && topic) return conversationApi.deleteTopic(topic.id);
    await conversationApi.saveTopic(topic?.id ?? null, value);
  });
  const deleting = mode === 'delete';
  const starting = mode === 'start';
  // The prompt is learning content; keep it in the target language regardless of display locale.
  const prompt = `Let's practice English conversation.\nTopic: ${input.title}\nSituation: ${input.scenario}\nMy role: ${input.learnerRole}\nYour role: ${input.aiRole}\nGoal: ${input.objective}\nLevel: ${input.difficulty}\nPlease ask one question at a time. After our conversation, summarize expressions I used and new expressions to learn.`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (!deleting) {
      for (const field of textFields) {
        const control = event.currentTarget.elements.namedItem(field.name);
        if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
          control.setCustomValidity(input[field.name].trim() ? '' : t('requiredError'));
        }
      }
      if (!event.currentTarget.reportValidity()) return;
    }
    submitting.current = true;
    try {
      await mutation.mutateAsync(input);
      notify(t(deleting ? 'topicDeleted' : 'topicSaved'));
      onComplete();
    } catch {
      /* The mutation error is displayed without losing the form. */
    } finally {
      submitting.current = false;
    }
  }

  return (
    <Modal
      className={styles.dialog}
      titleId={`${id}-title`}
      descriptionId={`${id}-description`}
      pending={mutation.isPending}
      onDismiss={onDismiss}
      initialFocusRef={starting ? promptRef : deleting ? cancelRef : firstRef}
    >
      <div className={styles.dialogHeading}>
        <Heading as="h2" id={`${id}-title`}>
          {t(
            starting
              ? 'topicPromptTitle'
              : deleting
                ? 'topicDeleteTitle'
                : topic
                  ? 'topicEdit'
                  : 'topicCreate',
          )}
        </Heading>
        <Button
          type="button"
          variant="ghost"
          iconOnly
          aria-label={t('close')}
          disabled={mutation.isPending}
          onClick={onDismiss}
        >
          <Icon name="close" />
        </Button>
      </div>
      <p id={`${id}-description`} className={styles.dialogDescription}>
        {t(
          starting
            ? 'topicPromptDescription'
            : deleting
              ? 'topicDeleteDescription'
              : 'topicFormDescription',
          { title: topic?.title ?? '' },
        )}
      </p>
      {starting ? (
        <div className={styles.dialogBody}>
          <Textarea
            ref={promptRef}
            rows={10}
            readOnly
            aria-label={t('topicPromptTitle')}
            value={prompt}
          />
          <div className={styles.dialogActions}>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prompt);
                  notify(t('topicCopied'));
                } catch {
                  promptRef.current?.focus();
                  promptRef.current?.select();
                  notify(t('topicCopyError'));
                }
              }}
            >
              {t('topicCopyPrompt')}
            </Button>
            <a
              className={styles.actionLink}
              href="https://chatgpt.com/"
              target="_blank"
              rel="noreferrer"
            >
              {t('topicOpenChatGPT')}
              <Icon name="external" size={15} />
            </a>
          </div>
          <Button
            className={styles.fullWidth}
            variant="outline"
            onClick={() => navigate(`/conversations/new?topic=${topic?.id ?? ''}`)}
          >
            {t('records')}
            <Icon name="arrow" size={16} />
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} aria-busy={mutation.isPending}>
          <fieldset className={styles.controls} disabled={mutation.isPending}>
            {!deleting && (
              <div className={styles.dialogBody}>
                {textFields.map((field) => (
                  <div className={styles.field} key={field.name}>
                    <FormLabel htmlFor={`${id}-${field.name}`}>{t(field.label)}</FormLabel>
                    <Input
                      id={`${id}-${field.name}`}
                      name={field.name}
                      ref={field.name === 'title' ? firstRef : undefined}
                      maxLength={field.limit}
                      required
                      value={input[field.name]}
                      onChange={(event) => {
                        event.currentTarget.setCustomValidity('');
                        setInput({ ...input, [field.name]: event.target.value });
                      }}
                    />
                  </div>
                ))}
                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <FormLabel htmlFor={`${id}-category`}>{t('topicCategory')}</FormLabel>
                    <Select
                      id={`${id}-category`}
                      size="sm"
                      value={input.category}
                      onChange={(event) =>
                        setInput({
                          ...input,
                          category: event.target.value as TopicInput['category'],
                        })
                      }
                    >
                      {categories.map((value) => (
                        <option key={value} value={value}>
                          {t(categoryKeys[value])}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className={styles.field}>
                    <FormLabel htmlFor={`${id}-difficulty`}>{t('topicDifficulty')}</FormLabel>
                    <Select
                      id={`${id}-difficulty`}
                      size="sm"
                      value={input.difficulty}
                      onChange={(event) =>
                        setInput({
                          ...input,
                          difficulty: event.target.value as TopicInput['difficulty'],
                        })
                      }
                    >
                      {difficulties.map((value) => (
                        <option key={value} value={value}>
                          {t(difficultyKeys[value])}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            )}
            {mutation.isError && (
              <p className={styles.error} role="alert">
                {t(deleting ? 'deleteError' : 'conversationSaveError')}
              </p>
            )}
            <div className={styles.dialogActions}>
              <Button
                type="button"
                variant="outline"
                tone="neutral"
                ref={cancelRef}
                onClick={onDismiss}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" tone={deleting ? 'danger' : 'brand'}>
                {t(mutation.isPending ? 'saving' : deleting ? 'delete' : 'update')}
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </Modal>
  );
};
