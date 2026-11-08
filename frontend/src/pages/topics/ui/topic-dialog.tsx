import { type SubmitEvent, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { conversationApi, type Topic, type TopicInput } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { useLearningLanguage } from '@/shared/learning-language';
import { useFormValidation } from '@/shared/model/use-form-validation';
import { Button } from '@/shared/ui/Button';
import { FieldError } from '@/shared/ui/FieldError';
import { FormLabel } from '@/shared/ui/FormLabel';
import { Heading } from '@/shared/ui/Heading';
import { Icon } from '@/shared/ui/Icon';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { useToast } from '@/shared/ui/Toast';

import {
  categoryKeys,
  difficultyKeys,
  useConversationMutation,
} from '../../../features/conversation-workspace';
import { categories, difficulties } from '../model';

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
  const { language } = useLearningLanguage();
  const navigate = useNavigate();
  const notify = useToast();
  const id = useId();
  const firstRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const submitting = useRef(false);
  const validation = useFormValidation();
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
  // Practice the selected learning language regardless of the display locale.
  const targetLanguage = language === 'ja' ? 'Japanese' : 'English';
  const prompt = `Let's practice ${targetLanguage} conversation.\nTopic: ${input.title}\nSituation: ${input.scenario}\nMy role: ${input.learnerRole}\nYour role: ${input.aiRole}\nGoal: ${input.objective}\nLevel: ${input.difficulty}\nPlease ask one question at a time. After our conversation, summarize expressions I used and new expressions to learn.`;

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (!deleting && !validation.validate(event.currentTarget)) return;
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
            <Link href="https://chatgpt.com/">{t('topicOpenChatGPT')}</Link>
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
        <form
          noValidate
          onInput={validation.onInput}
          onSubmit={submit}
          aria-busy={mutation.isPending}
        >
          <fieldset className={styles.controls} disabled={mutation.isPending}>
            {!deleting && (
              <div className={styles.dialogBody}>
                {textFields.map((field) => {
                  const validationField = validation.field(field.name);
                  return (
                    <div className={styles.field} key={field.name}>
                      <FormLabel htmlFor={`${id}-${field.name}`}>{t(field.label)}</FormLabel>
                      <Input
                        {...validationField.input}
                        id={`${id}-${field.name}`}
                        ref={field.name === 'title' ? firstRef : undefined}
                        maxLength={field.limit}
                        required
                        value={input[field.name]}
                        onChange={(event) =>
                          setInput({ ...input, [field.name]: event.target.value })
                        }
                      />
                      <FieldError {...validationField.error} />
                    </div>
                  );
                })}
                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <FormLabel htmlFor={`${id}-category`}>{t('topicCategory')}</FormLabel>
                    <Select
                      id={`${id}-category`}
                      size="sm"
                      value={input.category}
                      options={categories.map((value) => ({
                        label: t(categoryKeys[value]),
                        value,
                      }))}
                      onChange={(value) =>
                        setInput({
                          ...input,
                          category: value as TopicInput['category'],
                        })
                      }
                    />
                  </div>
                  <div className={styles.field}>
                    <FormLabel htmlFor={`${id}-difficulty`}>{t('topicDifficulty')}</FormLabel>
                    <Select
                      id={`${id}-difficulty`}
                      size="sm"
                      value={input.difficulty}
                      options={difficulties.map((value) => ({
                        label: t(difficultyKeys[value]),
                        value,
                      }))}
                      onChange={(value) =>
                        setInput({
                          ...input,
                          difficulty: value as TopicInput['difficulty'],
                        })
                      }
                    />
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
