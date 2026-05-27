import { useEffect, useState, useCallback } from 'react';
import { fetchTransactions, fetchConfig } from '../services/storage';
import { CACHE_KEYS } from '../constants';
import { readCache, writeCache } from '../utils/localCache';

const syncFromServer = async () => {
  const [transData, configData] = await Promise.all([fetchTransactions(), fetchConfig()]);
  return { transData, configData };
};

export const useAppData = () => {
  const [transactions, setTransactions] = useState(() => readCache(CACHE_KEYS.transactions) ?? []);
  const [appConfig, setAppConfig] = useState(() => readCache(CACHE_KEYS.config));
  const [loading, setLoading] = useState(!readCache(CACHE_KEYS.config));
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    syncFromServer()
      .then(({ transData, configData }) => {
        if (cancelled) return;
        if (transData === null) {
          setSyncError(true);
          return;
        }
        setTransactions(transData);
        writeCache(CACHE_KEYS.transactions, transData);
        setSyncError(false);
        if (configData) {
          setAppConfig(configData);
          writeCache(CACHE_KEYS.config, configData);
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
  }, []);

  const setTransactionsAndCache = useCallback((updater) => {
    setTransactions((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeCache(CACHE_KEYS.transactions, next);
      return next;
    });
  }, []);

  return {
    transactions,
    setTransactions: setTransactionsAndCache,
    appConfig,
    loading,
    syncError,
  };
};
