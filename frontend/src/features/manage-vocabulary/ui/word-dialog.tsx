import { StudyItemDialog, type StudyItemDialogProps } from './index';

const wordDialogCopy = {
  createTitle: 'wordCreateTitle',
  exampleLabel: 'studyExample',
  textLabel: 'studyWord',
} as const;

export const WordDialog = (props: Omit<StudyItemDialogProps, 'copy' | 'kind'>) => (
  <StudyItemDialog {...props} copy={wordDialogCopy} kind="word" />
);
