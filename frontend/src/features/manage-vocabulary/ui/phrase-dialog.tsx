import { StudyItemDialog, type StudyItemDialogProps } from './index';

const phraseDialogCopy = {
  createTitle: 'phraseCreateTitle',
  exampleLabel: 'studyMemo',
  textLabel: 'studyPhrase',
} as const;

export const PhraseDialog = (props: Omit<StudyItemDialogProps, 'copy' | 'kind'>) => (
  <StudyItemDialog {...props} copy={phraseDialogCopy} kind="phrase" />
);
