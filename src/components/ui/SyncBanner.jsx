import { RefreshCw, WifiOff } from 'lucide-react';

const SyncBanner = ({ message, onRetry, retrying }) => (
  <div className="sync-banner" role="status">
    <WifiOff size={16} />
    <span>{message}</span>
    {onRetry && (
      <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry} disabled={retrying}>
        <RefreshCw size={14} className={retrying ? 'spinning' : ''} />
        {retrying ? 'Retrying...' : 'Retry'}
      </button>
    )}
  </div>
);

export default SyncBanner;
