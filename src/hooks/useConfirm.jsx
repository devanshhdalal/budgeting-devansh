import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

/**
 * Promise-based confirm dialog (accessible alternative to window.confirm).
 * Render `confirmDialog` in the component tree.
 */
export function useConfirm() {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(
    ({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setState({ title, message, confirmLabel, cancelLabel, danger });
      }),
    []
  );

  const close = useCallback((result) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }, []);

  const confirmDialog = state ? (
    <ConfirmDialog
      open
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      danger={state.danger}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null;

  return { confirm, confirmDialog };
}
