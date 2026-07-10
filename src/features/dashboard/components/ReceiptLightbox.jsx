import { useState } from 'react';
import Modal from '@/components/ui/Modal';

const ReceiptLightbox = ({ open, src, onClose }) => {
  const [status, setStatus] = useState('loading');

  return (
    <Modal open={open} onClose={onClose} lightbox onOverlayClick={onClose}>
      {status === 'loading' && (
        <div className="lightbox-loading" aria-live="polite">
          <div className="loading-mark" aria-hidden />
          <span>Loading receipt…</span>
        </div>
      )}
      {status === 'error' && (
        <div className="lightbox-error" role="alert">
          Could not load receipt image.
        </div>
      )}
      <img
        src={src}
        alt="Receipt"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        style={{ display: status === 'loaded' ? 'block' : 'none' }}
      />
    </Modal>
  );
};

export default ReceiptLightbox;
