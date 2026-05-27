import { useEffect, useState } from 'react';
import { fetchConfig } from '../services/storage';
import { useUser } from './useUser';

export const useConfig = () => {
  const { userId } = useUser();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchConfig().then((data) => {
      if (!cancelled) {
        if (data) setConfig(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { config, setConfig, loading };
};
