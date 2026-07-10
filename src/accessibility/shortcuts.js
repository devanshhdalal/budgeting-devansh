import { modPlus } from './modKey';

export const SHORTCUT_GROUPS = [
  {
    id: 'general',
    title: 'General',
    items: [
      { id: 'help', label: 'Open keyboard shortcuts', keys: ['?'] },
      { id: 'close', label: 'Close menu or dialog', keys: ['Esc'] },
      { id: 'menu', label: 'Toggle navigation menu', keys: [modPlus('M')] },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    items: [
      { id: 'overview', label: 'Go to Overview', keys: [modPlus('1')] },
      { id: 'subscriptions', label: 'Go to Subscriptions', keys: [modPlus('2')] },
      { id: 'add', label: 'Go to Add transaction', keys: [modPlus('3')] },
      { id: 'settings', label: 'Go to Settings', keys: [modPlus('4')] },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    items: [{ id: 'search', label: 'Focus search', keys: ['/'] }],
  },
];
