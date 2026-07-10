import TransactionForm from '@/features/transactions/components/TransactionForm';
import SaveIndicator from '@/components/ui/SaveIndicator';
import Modal from '@/components/ui/Modal';

const EditTransactionModal = ({
  open,
  formData,
  onChange,
  onClose,
  onFile,
  appConfig,
  saveStatus,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title="Edit transaction"
    wide
    titleExtra={<SaveIndicator status={saveStatus} />}
  >
    <TransactionForm formData={formData} onChange={onChange} onFileChange={onFile} config={appConfig} />
  </Modal>
);

export default EditTransactionModal;
