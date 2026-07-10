import { useCallback, useEffect, useRef } from 'react';

/** Debounce a callback; exposes flush (run now) and cancel. */
export function useDebouncedCallback(callback, delay = 500) {
  const callbackRef = useRef(callback);
  const timerRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const flush = useCallback((...args) => {
    cancel();
    return callbackRef.current(...args);
  }, [cancel]);

  const debounced = useCallback(
    (...args) => {
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        callbackRef.current(...args);
      }, delay);
    },
    [cancel, delay]
  );

  return { debounced, flush, cancel };
}
