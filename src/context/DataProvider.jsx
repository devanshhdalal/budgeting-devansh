import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchTransactions, fetchConfig } from '../services/storage';
import { cacheKeys } from '../constants';
import { readCache, writeCache } from '../utils/localCache';
import { getErrorCopy } from '../utils/apiErrors';
import { useUser } from '../hooks/useUser';
import { DataContext } from './dataContext';

const buildSyncMessage = (errors) => {
  if (errors.transactions && errors.config) return errors.transactions;
  if (errors.transactions) return `Transactions: ${errors.transactions}`;
  if (errors.config) return `Settings: ${errors.config}`;
  return null;
};

const UserDataProvider = ({ user, userId, children }) => {
  const keys = useMemo(() => cacheKeys(userId), [userId]);

  const [transactions, setTransactionsState] = useState(() => readCache(keys.transactions) ?? []);
  const [config, setConfigState] = useState(() => readCache(keys.config));
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(0);

  const syncFromServer = useCallback(async () => {
    const [tx, cfg] = await Promise.all([fetchTransactions(), fetchConfig()]);

    const errors = {};
    if (!tx.ok) errors.transactions = getErrorCopy({ status: tx.status, code: tx.code, error: tx.error });
    if (!cfg.ok) errors.config = getErrorCopy({ status: cfg.status, code: cfg.code, error: cfg.error });

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
      setSyncError(buildSyncMessage(errors));
      setSyncStatus(tx.status || cfg.status || 0);
    } else {
      setSyncError(null);
      setSyncStatus(0);
    }

    return { ok: !failed, errors };
  }, [keys.transactions, keys.config]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        await syncFromServer();
      } catch (err) {
        if (!cancelled) {
          setSyncError(err?.message ?? 'Unexpected sync error');
          setSyncStatus(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [syncFromServer]);

  const refresh = useCallback(async () => {
    setSyncError(null);
    setLoading(true);
    try {
      return await syncFromServer();
    } catch (err) {
      setSyncError(err?.message ?? 'Unexpected sync error');
      setSyncStatus(0);
      return { ok: false, errors: {} };
    } finally {
      setLoading(false);
    }
  }, [syncFromServer]);

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
      syncStatus,
      refresh,
      user,
      userId,
    }),
    [transactions, setTransactions, config, setConfig, loading, syncError, syncStatus, refresh, user, userId]
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
