import { ACTIVE_USER_STORAGE_KEY, DEFAULT_USER_ID, isValidUserId } from '../config/users';

/** Always reflects what is in localStorage so requests stay in sync with the active profile. */
export const getActiveUserId = () => {
  if (typeof localStorage === 'undefined') return DEFAULT_USER_ID;
  const stored = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
  return isValidUserId(stored) ? stored : DEFAULT_USER_ID;
};

export const setActiveUserId = (userId) => {
  if (!isValidUserId(userId)) return;
  localStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
};
