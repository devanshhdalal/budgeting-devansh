import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';

const ReceiptLightbox = ({ src, onClose }) => {
  const [status, setStatus] = useState('loading');
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal-content modal-lightbox"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>
        {status === 'loading' && (
          <div className="lightbox-loading" aria-live="polite">
            <div className="loading-mark" aria-hidden />
            <span>Loading receipt</span>
          </div>
        )}
        {status === 'error' && (
          <div className="lightbox-error" role="alert">
            <p>Could not load this receipt image.</p>
            <a className="btn btn-ghost" href={src} target="_blank" rel="noreferrer">Open original</a>
          </div>
        )}
        <img
          src={src}
          alt="Receipt"
          style={{ display: status === 'loaded' ? 'block' : 'none' }}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      </motion.div>
    </motion.div>
  );
};

export default ReceiptLightbox;
