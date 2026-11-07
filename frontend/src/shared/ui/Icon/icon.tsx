import styles from './icon.module.scss';
import type { ReactNode } from 'react';

const shapes = {
  plus: <path d="M12 5v14M5 12h14" />,
  book: <path d="M12 5v15M12 5C8 2 4 3 2 4v15c3-2 7-1 10 1 3-2 7-3 10-1V4c-2-1-6-2-10 1Z" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  edit: <path d="m16 3 5 5M3 21l5-1L21 7a2.8 2.8 0 0 0-4-4L4 16l-1 5Z" />,
  trash: <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  down: <path d="m6 9 6 6 6-6" />,
  repeat: <path d="m17 2 4 4-4 4M3 10V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4M21 14v2a2 2 0 0 1-2 2H3" />,
  home: (
    <>
      <rect x="3" y="3" width="6" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="5" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <rect x="13" y="12" width="8" height="9" rx="1" />
    </>
  ),
  chat: <path d="M21 11a9 9 0 0 1-9 9H3l1.5-5A9 9 0 1 1 21 11Z" />,
  layers: <path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18M5 6h14M5 18h14" />
    </>
  ),
  spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />,
  cloud: <path d="M7 19a5 5 0 1 1 1-9 6 6 0 0 1 11 2 3.5 3.5 0 0 1-1 7H7Z" />,
  flag: <path d="M5 21V3c5-4 9 4 15 0v11c-6 4-10-4-15 0" />,
  sun: <path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof shapes;

export const Icon = ({ name, className = '' }: { name: IconName; className?: string }) => {
  return (
    <svg
      className={`${styles.icon} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  );
};
