import { useEffect, useRef } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';

const vibrate = (pattern) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
};

/**
 * Mobile-only pull-to-refresh indicator that triggers DataProvider.refresh().
 * Disables itself on touch-free pointers (covered by CSS @media hover: hover).
 */
const PullToRefresh = () => {
  const { refresh } = useData();
  const toast = useToast();

  const handleRefresh = async () => {
    const result = await refresh();
    if (!result?.ok) toast.error('Refresh failed');
  };

  const { distance, progress, state } = usePullToRefresh(handleRefresh);
  const lastState = useRef(state);
  const flash = useAnimationControls();

  // Threshold-crossed pulse: light haptic + scale + color flash.
  useEffect(() => {
    if (state === lastState.current) return;

    if (state === 'ready' && lastState.current !== 'ready') {
      vibrate(12);
      flash.start({
        scale: [1, 1.06, 1],
        transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
      });
    }
    if (state === 'refreshing') {
      vibrate([18, 30, 8]);
    }
    lastState.current = state;
  }, [state, flash]);

  const visible = distance > 0 || state === 'refreshing';

  return (
    <div className="ptr-indicator" aria-hidden={!visible} data-state={state}>
      <motion.div
        className="ptr-pill"
        animate={{
          y: visible ? distance - 48 : -72,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: visible ? 360 : 520,
          damping: visible ? 30 : 38,
          mass: 0.6,
        }}
      >
        <motion.span className="ptr-icon" animate={flash}>
          <motion.span
            className="ptr-icon-rotor"
            animate={
              state === 'refreshing'
                ? { rotate: 360 }
                : { rotate: progress * 270 }
            }
            transition={
              state === 'refreshing'
                ? { repeat: Infinity, duration: 0.9, ease: 'linear' }
                : { type: 'spring', stiffness: 280, damping: 26 }
            }
          >
            <RefreshCw size={16} strokeWidth={2.5} />
          </motion.span>
        </motion.span>
        <span className="ptr-label">
          {state === 'refreshing'
            ? 'Refreshing'
            : state === 'ready'
              ? 'Release to refresh'
              : 'Pull to refresh'}
        </span>
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
