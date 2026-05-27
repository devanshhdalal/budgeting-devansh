import { useState, useEffect, useMemo } from 'react';
import { USERS, DEFAULT_USER_ID } from '../config/users';
import { UserContext } from './userContext';

const STORAGE_KEY = 'budget_active_user';

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return USERS.some((u) => u.id === saved) ? saved : DEFAULT_USER_ID;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, userId);
    window.dispatchEvent(new CustomEvent('budget-user-changed', { detail: userId }));
  }, [userId]);

  const user = useMemo(() => USERS.find((u) => u.id === userId) ?? USERS[0], [userId]);

  return (
    <UserContext.Provider value={{ userId, setUserId, user, users: USERS }}>
      {children}
    </UserContext.Provider>
  );
};
