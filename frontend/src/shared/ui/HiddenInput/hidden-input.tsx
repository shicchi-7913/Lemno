import type { ComponentProps } from 'react';

type HiddenInputProps = Omit<ComponentProps<'input'>, 'type'>;

export const HiddenInput = (props: HiddenInputProps) => <input {...props} type="hidden" />;
