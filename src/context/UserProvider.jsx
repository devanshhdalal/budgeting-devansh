import { useEffect, useMemo, useState } from 'react';
import { USERS } from '../config/users';
import { getActiveUserId, setActiveUserId } from '../services/session';
import { UserContext } from './userContext';

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(getActiveUserId);

  useEffect(() => {
    setActiveUserId(userId);
  }, [userId]);

  const value = useMemo(
    () => ({
      userId,
      setUserId,
      user: USERS.find((u) => u.id === userId) ?? USERS[0],
      users: USERS,
    }),
    [userId]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
