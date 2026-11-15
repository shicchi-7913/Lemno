import { StudyItemDialog, type StudyItemDialogProps } from './index';

const wordDialogCopy = {
  createTitle: 'wordCreateTitle',
  exampleLabel: 'studyExample',
  examplePlaceholder: 'studyExamplePlaceholder',
  meaningPlaceholder: 'studyMeaningPlaceholder',
  textLabel: 'studyWord',
  textPlaceholder: 'wordPlaceholder',
} as const;

export const WordDialog = (props: Omit<StudyItemDialogProps, 'copy' | 'kind'>) => (
  <StudyItemDialog {...props} copy={wordDialogCopy} kind="word" />
);
