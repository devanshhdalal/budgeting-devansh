export const USERS = [
  { id: 'devansh', name: 'Devansh Dalal' },
  { id: 'paula', name: 'Paula' },
];

export const DEFAULT_USER_ID = 'devansh';

export const ACTIVE_USER_STORAGE_KEY = 'budget_active_user';

export const isValidUserId = (id) => USERS.some((u) => u.id === id);
