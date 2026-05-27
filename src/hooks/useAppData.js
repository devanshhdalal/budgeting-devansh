import { useEffect, useState, useCallback } from 'react';
import { fetchTransactions, fetchConfig } from '../services/storage';
import { cacheKeys } from '../constants';
import { readCache, writeCache } from '../utils/localCache';
import { useUser } from './useUser';

export const useAppData = () => {
  const { userId, user } = useUser();
  const keys = cacheKeys(userId);

  const [transactions, setTransactions] = useState(() => readCache(keys.transactions) ?? []);
  const [appConfig, setAppConfig] = useState(() => readCache(keys.config));
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchTransactions(), fetchConfig()])
      .then(([transData, configData]) => {
        if (cancelled) return;
        if (transData === null) {
          setSyncError(true);
          return;
        }
        setTransactions(transData);
        writeCache(keys.transactions, transData);
        setSyncError(false);
        if (configData) {
          setAppConfig(configData);
          writeCache(keys.config, configData);
        }
      })
      .catch((err) => {
        console.error('Failed to sync data', err);
        if (!cancelled) setSyncError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, keys.transactions, keys.config]);

  const setTransactionsAndCache = useCallback(
    (updater) => {
      setTransactions((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        writeCache(keys.transactions, next);
        return next;
      });
    },
    [keys.transactions]
  );

  return {
    transactions,
    setTransactions: setTransactionsAndCache,
    appConfig,
    loading,
    syncError,
    user,
  };
};
