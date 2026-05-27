import { DEFAULT_USER_ID } from '../config/users';

let activeUserId = localStorage.getItem('budget_active_user') || DEFAULT_USER_ID;

export const getActiveUserId = () => activeUserId;

export const setActiveUserId = (userId) => {
  activeUserId = userId;
};

if (typeof window !== 'undefined') {
  window.addEventListener('budget-user-changed', (e) => {
    activeUserId = e.detail;
  });
}
