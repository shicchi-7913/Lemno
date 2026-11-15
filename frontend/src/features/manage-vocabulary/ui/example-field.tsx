import { type ComponentProps } from 'react';

import { useI18n } from '@/shared/i18n';
import { FieldError } from '@/shared/ui/FieldError';
import { FormLabel } from '@/shared/ui/FormLabel';
import { Textarea } from '@/shared/ui/Textarea';

import styles from './dialog.module.scss';

export interface ExampleFieldProps {
  errorProps: ComponentProps<typeof FieldError>;
  id: string;
  textareaProps: ComponentProps<typeof Textarea>;
}

interface LabeledExampleFieldProps extends ExampleFieldProps {
  labelKey: 'studyExample' | 'studyMemo';
}

export const ExampleField = ({
  errorProps,
  id,
  labelKey,
  textareaProps,
}: LabeledExampleFieldProps) => {
  const { t } = useI18n();

  return (
    <div className={styles.field}>
      <FormLabel htmlFor={id}>{t(labelKey)}</FormLabel>
      <Textarea {...textareaProps} id={id} />
      <FieldError {...errorProps} />
    </div>
  );
};
