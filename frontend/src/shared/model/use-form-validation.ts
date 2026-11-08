import { type InputEvent, useId, useRef, useState } from 'react';

import { useI18n } from '../i18n';

type Control = HTMLInputElement | HTMLTextAreaElement;

export function useFormValidation() {
  const { t } = useI18n();
  const id = useId();
  const attempted = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function message(control: Control) {
    if (control.validity.badInput) return t('fieldNumberError');
    if (control.required && !control.value.trim()) return t('fieldRequiredError');
    if (control.type === 'number' && control.value) {
      const input = control as HTMLInputElement;
      if (
        input.validity.rangeUnderflow ||
        input.validity.rangeOverflow ||
        input.validity.stepMismatch
      )
        return t('fieldNumberRangeError', { min: input.min, max: input.max });
    }
    if (control.maxLength >= 0 && control.value.length > control.maxLength)
      return t('fieldMaxLengthError', { count: control.maxLength });
    return '';
  }

  function validate(form: HTMLFormElement) {
    attempted.current = true;
    const next: Record<string, string> = {};
    let first: Control | undefined;
    for (const control of Array.from(form.elements)) {
      if (
        !(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) ||
        !control.name ||
        !control.willValidate
      )
        continue;
      const error = message(control);
      if (error) {
        next[control.name] = error;
        first ??= control;
      }
    }
    setErrors(next);
    first?.focus();
    return !first;
  }

  function onInput(event: InputEvent<HTMLFormElement>) {
    const control = event.target;
    if (
      !attempted.current ||
      !(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) ||
      !control.name ||
      !control.willValidate
    )
      return;
    const error = message(control);
    setErrors((previous) => ({ ...previous, [control.name]: error }));
  }

  function field(name: string) {
    return {
      input: {
        name,
        'aria-invalid': errors[name] ? true : undefined,
        'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
      },
      error: { id: `${id}-${name}-error`, message: errors[name] },
    } as const;
  }

  function clearErrors() {
    attempted.current = false;
    setErrors({});
  }

  return { validate, onInput, field, clearErrors };
}
