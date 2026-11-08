import { startupErrorMessage } from '../../shared/i18n';

import styles from './startup-error.module.scss';

export const StartupError = () => (
  <p className={styles.startupError}>
    {/* Use bundled messages even when i18next initialization fails. */}
    {startupErrorMessage}
  </p>
);
