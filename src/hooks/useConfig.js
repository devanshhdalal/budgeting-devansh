import { useEffect, useState } from 'react';
import { fetchConfig } from '../services/storage';

export const useConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchConfig().then((data) => {
      if (!cancelled && data) setConfig(data);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, setConfig, loading };
};
