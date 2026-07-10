import { createPortal } from 'react-dom';
import { useEffect, useId, useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/accessibility/useFocusTrap';
import { useBodyScrollLock } from '@/accessibility/useBodyScrollLock';

const Modal = ({
  open,
  onClose,
  title,
  titleExtra,
  children,
  wide = false,
  className = '',
  lightbox = false,
  onOverlayClick,
}) => {
  const panelRef = useRef(null);
  const titleId = useId();

  useFocusTrap(panelRef, open);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = () => {
    if (onOverlayClick) onOverlayClick();
    else onClose?.();
  };

  return createPortal(
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleOverlayClick}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`modal-content ${wide ? 'modal-content-wide' : ''} ${lightbox ? 'modal-lightbox' : ''} ${className}`.trim()}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>
        {(title || titleExtra) && (
          <div className="modal-title-row">
            {title && (
              <h2 id={titleId} className="page-title modal-title">
                {title}
              </h2>
            )}
            {titleExtra}
          </div>
        )}
        {children}
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default Modal;
