import { motion } from 'framer-motion';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

const ICONS = {
  network: WifiOff,
  error: AlertTriangle,
};

/**
 * Full-page error state used when a page cannot render without its data
 * (e.g. configuration failed to load and there is no cached copy).
 */
const PageError = ({
  variant = 'error',
  title = 'Something went wrong',
  description,
  onRetry,
  retrying = false,
  retryLabel = 'Try again',
  children,
}) => {
  const Icon = ICONS[variant] ?? AlertTriangle;
  return (
    <motion.div
      className={`page-error page-error-${variant}`}
      role="alert"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="page-error-icon">
        <Icon size={26} strokeWidth={1.8} />
      </div>
      <h2 className="page-error-title">{title}</h2>
      {description && <p className="page-error-desc">{description}</p>}
      {children}
      {onRetry && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onRetry}
          disabled={retrying}
        >
          <RefreshCw size={16} className={retrying ? 'spinning' : ''} />
          {retrying ? 'Retrying...' : retryLabel}
        </button>
      )}
    </motion.div>
  );
};

export default PageError;
