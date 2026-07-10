export const USERS = [
  { id: 'devansh', name: 'Devansh Dalal' },
  { id: 'paula', name: 'Paula' },
];

export const DEFAULT_USER_ID = 'devansh';

const USER_IDS = new Set(USERS.map((u) => u.id));

/** API key → user id (Shortcuts use one key per person). */
export const buildApiKeyMap = () => {
  const map = new Map();
  const add = (key, userId) => {
    if (key && USER_IDS.has(userId)) map.set(key, userId);
  };

  add(process.env.API_KEY_DEVANSH, 'devansh');
  add(process.env.API_KEY_PAULA, 'paula');
  add(process.env.API_KEY_AMEX, 'devansh');
  add(process.env.API_KEY_NEO, 'devansh');
  add(process.env.API_KEY_SCOTIA, 'devansh');

  // Legacy single key -> Devansh Dalal (existing Shortcut / deploys)
  if (process.env.API_KEY && !process.env.API_KEY_DEVANSH) {
    add(process.env.API_KEY, 'devansh');
  }

  return map;
};

export const isValidUserId = (id) => USER_IDS.has(id);
