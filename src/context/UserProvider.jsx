import { useEffect, useMemo, useState } from 'react';
import { FALLBACK_USERS, DEFAULT_USER_ID } from '../config/users';
import { fetchUsers } from '../services/storage';
import { getActiveUserId, setActiveUserId } from '../services/session';
import { UserContext } from './userContext';

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(getActiveUserId);
  const [users, setUsers] = useState(FALLBACK_USERS);

  useEffect(() => {
    setActiveUserId(userId);
  }, [userId]);

  useEffect(() => {
    fetchUsers().then((result) => {
      if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
        setUsers(result.data);
      }
    });
  }, []);

  const value = useMemo(
    () => ({
      userId,
      setUserId,
      user: users.find((u) => u.id === userId) ?? users.find((u) => u.id === DEFAULT_USER_ID) ?? users[0],
      users,
    }),
    [userId, users]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
