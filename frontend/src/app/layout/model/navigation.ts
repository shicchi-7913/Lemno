import type { ComponentProps } from 'react';
import { matchPath } from 'react-router';
import type { t } from '../../../shared/i18n';
import type { Icon } from '../../../shared/ui/Icon';

export interface NavigationEntry {
  label: Parameters<typeof t>[0];
  icon: ComponentProps<typeof Icon>['name'];
  to?: string;
}

interface NavigationGroup {
  heading: string;
  items: NavigationEntry[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    heading: 'WORKSPACE',
    items: [
      { label: 'home', icon: 'home' },
      { label: 'topics', icon: 'chat' },
      { label: 'vocabulary', icon: 'book', to: '/' },
      { label: 'phrases', icon: 'layers' },
    ],
  },
  {
    heading: 'EXPLORE',
    items: [
      { label: 'profiles', icon: 'globe' },
      { label: 'goals', icon: 'flag' },
      { label: 'integration', icon: 'spark' },
      { label: 'data', icon: 'cloud' },
      { label: 'prepare', icon: 'edit' },
      { label: 'records', icon: 'book' },
      { label: 'guide', icon: 'spark' },
    ],
  },
];

export function getCurrentNavigation(pathname: string) {
  return navigationGroups
    .flatMap((group) => group.items)
    .find((item) => item.to && matchPath({ path: item.to, end: item.to === '/' }, pathname));
}
