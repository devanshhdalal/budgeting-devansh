import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchTransactions, fetchConfig } from '../services/storage';
import { cacheKeys } from '../constants';
import { readCache, writeCache } from '../utils/localCache';
import { useUser } from '../hooks/useUser';
import { DataContext } from './dataContext';

/**
 * Inner provider that owns state for a single user.
 * The outer `DataProvider` keys this component on `userId`, so switching profile
 * remounts it cleanly without setState-in-effect resets.
 */
const UserDataProvider = ({ user, userId, children }) => {
  const keys = useMemo(() => cacheKeys(userId), [userId]);

  const [transactions, setTransactionsState] = useState(() => readCache(keys.transactions) ?? []);
  const [config, setConfigState] = useState(() => readCache(keys.config));
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchTransactions(), fetchConfig()])
      .then(([tx, cfg]) => {
        if (cancelled) return;
        if (tx.ok) {
          setTransactionsState(tx.data);
          writeCache(keys.transactions, tx.data);
        }
        if (cfg.ok && cfg.data) {
          setConfigState(cfg.data);
          writeCache(keys.config, cfg.data);
        }
        const failed = !tx.ok || !cfg.ok;
        if (failed) {
          setSyncError(tx.error || cfg.error || 'Sync failed');
        }
      })
      .catch((err) => {
        if (!cancelled) setSyncError(err?.message ?? 'Unexpected sync error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [keys.transactions, keys.config, refreshNonce]);

  const refresh = useCallback(() => {
    setLoading(true);
    setSyncError(null);
    setRefreshNonce((n) => n + 1);
  }, []);

  const setTransactions = useCallback(
    (updater) => {
      setTransactionsState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        writeCache(keys.transactions, next);
        return next;
      });
    },
    [keys.transactions]
  );

  const setConfig = useCallback(
    (updater) => {
      setConfigState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (next) writeCache(keys.config, next);
        return next;
      });
    },
    [keys.config]
  );

  const value = useMemo(
    () => ({
      transactions,
      setTransactions,
      config,
      setConfig,
      loading,
      syncError,
      refresh,
      user,
      userId,
    }),
    [transactions, setTransactions, config, setConfig, loading, syncError, refresh, user, userId]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const DataProvider = ({ children }) => {
  const { userId, user } = useUser();
  return (
    <UserDataProvider key={userId} userId={userId} user={user}>
      {children}
    </UserDataProvider>
  );
};
