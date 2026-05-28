import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useData } from '../../hooks/useData';

/**
 * Mobile-only pull-to-refresh indicator that triggers DataProvider.refresh().
 * Disables itself on touch-free pointers (covered by CSS @media hover: hover).
 */
const PullToRefresh = () => {
  const { refresh } = useData();
  const { distance, progress, state } = usePullToRefresh(refresh);

  const visible = distance > 0 || state === 'refreshing';

  return (
    <div className="ptr-indicator" aria-hidden={!visible} data-state={state}>
      <motion.div
        className="ptr-pill"
        animate={{
          y: visible ? distance - 56 : -64,
          opacity: visible ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <motion.span
          className="ptr-icon"
          animate={
            state === 'refreshing'
              ? { rotate: 360 }
              : { rotate: progress * 270 }
          }
          transition={
            state === 'refreshing'
              ? { repeat: Infinity, duration: 0.9, ease: 'linear' }
              : { type: 'spring', stiffness: 260, damping: 24 }
          }
        >
          <RefreshCw size={16} strokeWidth={2.5} />
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
