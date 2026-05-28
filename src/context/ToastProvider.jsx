import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { ToastContext } from './toastContext';

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const DEFAULT_DURATION = 3800;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast) => {
      const id = crypto.randomUUID?.() ?? `t-${Date.now()}-${Math.random()}`;
      const entry = {
        id,
        type: toast.type ?? 'info',
        title: toast.title,
        description: toast.description,
        action: toast.action,
        duration: toast.duration ?? DEFAULT_DURATION,
      };
      setToasts((prev) => [...prev, entry]);
      if (entry.duration > 0) {
        const handle = setTimeout(() => dismiss(id), entry.duration);
        timers.current.set(id, handle);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      toast: push,
      success: (title, options = {}) => push({ ...options, type: 'success', title }),
      error: (title, options = {}) => push({ ...options, type: 'error', title }),
      info: (title, options = {}) => push({ ...options, type: 'info', title }),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport" role="region" aria-label="Notifications" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] ?? Info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                className={`toast-card toast-${t.type}`}
                role={t.type === 'error' ? 'alert' : 'status'}
              >
                <Icon size={18} className="toast-icon" />
                <div className="toast-body">
                  <p className="toast-title">{t.title}</p>
                  {t.description && <p className="toast-desc">{t.description}</p>}
                </div>
                {t.action && (
                  <button
                    type="button"
                    className="toast-action"
                    onClick={() => {
                      t.action.onClick();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  type="button"
                  className="toast-close"
                  aria-label="Dismiss"
                  onClick={() => dismiss(t.id)}
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
