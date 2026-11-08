import { Icon } from '../Icon';

import styles from './field-error.module.scss';

export const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} className={styles.error} role="alert">
      <Icon name="info" size={14} />
      <span>{message}</span>
    </p>
  ) : null;
