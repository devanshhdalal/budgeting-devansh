import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_THRESHOLD = 80;
const MAX_PULL = 140;
const RESISTANCE = 0.55;

const isAtTop = () =>
  (window.scrollY || document.documentElement.scrollTop || 0) <= 0;

/**
 * Touch-driven pull-to-refresh.
 *
 * Returns:
 *   - distance: current pull distance in pixels (0..MAX_PULL)
 *   - progress: 0..1 ratio toward the threshold
 *   - state: 'idle' | 'pulling' | 'ready' | 'refreshing'
 */
export const usePullToRefresh = (onRefresh, { threshold = DEFAULT_THRESHOLD, enabled = true } = {}) => {
  const [distance, setDistance] = useState(0);
  const [state, setState] = useState('idle');

  const startY = useRef(null);
  const armed = useRef(false);
  const stateRef = useRef('idle');

  const setStateBoth = useCallback((next) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const onTouchStart = (e) => {
      if (stateRef.current === 'refreshing') return;
      if (!isAtTop()) return;
      startY.current = e.touches[0].clientY;
      armed.current = true;
    };

    const onTouchMove = (e) => {
      if (!armed.current || startY.current == null) return;
      if (stateRef.current === 'refreshing') return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setDistance(0);
        if (stateRef.current !== 'idle') setStateBoth('idle');
        return;
      }
      if (!isAtTop()) {
        armed.current = false;
        setDistance(0);
        return;
      }

      e.preventDefault();
      const pulled = Math.min(MAX_PULL, delta * RESISTANCE);
      setDistance(pulled);
      setStateBoth(pulled >= threshold ? 'ready' : 'pulling');
    };

    const onTouchEnd = async () => {
      if (!armed.current) return;
      armed.current = false;
      startY.current = null;

      if (stateRef.current === 'ready') {
        setStateBoth('refreshing');
        setDistance(threshold);
        try {
          await onRefresh?.();
        } finally {
          setStateBoth('idle');
          setDistance(0);
        }
      } else {
        setStateBoth('idle');
        setDistance(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, threshold, onRefresh, setStateBoth]);

  const progress = Math.min(1, distance / threshold);

  return { distance, progress, state };
};
