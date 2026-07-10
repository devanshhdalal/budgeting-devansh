import { Loader2, Check, AlertCircle } from 'lucide-react';

const SaveIndicator = ({ status = 'idle', className = '' }) => {
  if (status === 'idle') return null;

  const labels = {
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Save failed',
  };

  const icons = {
    saving: <Loader2 size={16} className="save-indicator-spin" aria-hidden />,
    saved: <Check size={16} aria-hidden />,
    error: <AlertCircle size={16} aria-hidden />,
  };

  return (
    <span className={`save-indicator save-indicator-${status} ${className}`.trim()} role="status" aria-live="polite">
      {icons[status]}
      <span>{labels[status]}</span>
    </span>
  );
};

export default SaveIndicator;
