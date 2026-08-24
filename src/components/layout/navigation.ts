import type { IconName } from '@/components/ui/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Shown in the collapsed rail and on mobile. */
  short: string;
  end?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: 'dashboard', end: true },
  { to: '/candidates', label: 'Candidates', short: 'People', icon: 'users' },
  { to: '/interviews', label: 'Interviews', short: 'Interviews', icon: 'clipboard' },
  { to: '/templates', label: 'Interview Templates', short: 'Templates', icon: 'layers' },
  { to: '/questions', label: 'Question Bank', short: 'Questions', icon: 'helpCircle' },
  { to: '/reports', label: 'Reports', short: 'Reports', icon: 'barChart' },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: 'settings' },
];

export const MOBILE_NAV: NavItem[] = [
  PRIMARY_NAV[0],
  PRIMARY_NAV[1],
  PRIMARY_NAV[2],
  PRIMARY_NAV[5],
  PRIMARY_NAV[6],
];
