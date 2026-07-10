import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import TransactionForm from '../TransactionForm';
import SaveIndicator from '../ui/SaveIndicator';

const EditTransactionModal = ({
  formData,
  onChange,
  onClose,
  onFile,
  appConfig,
  saveStatus,
}) => (
  <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div
      className="modal-content modal-content-wide"
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
    >
      <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
        <X size={22} />
      </button>
      <div className="modal-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
        <h2 className="page-title" style={{ fontSize: '1.35rem', margin: 0 }}>Edit transaction</h2>
        <SaveIndicator status={saveStatus} />
      </div>
      <TransactionForm
        formData={formData}
        onChange={onChange}
        onFileChange={onFile}
        config={appConfig}
      />
    </motion.div>
  </motion.div>
);

export default EditTransactionModal;
