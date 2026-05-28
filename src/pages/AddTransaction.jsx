import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowRight, Upload, Image as ImageIcon } from 'lucide-react';
import { saveTransaction, uploadReceipt } from '../services/storage';
import { todayIsoDate } from '../utils/date';
import { useData } from '../hooks/useData';
import { useToast } from '../hooks/useToast';
import DateField from '../components/DateField';
import PageHeader from '../components/ui/PageHeader';
import PageError from '../components/ui/PageError';
import LoadingScreen from '../components/layout/LoadingScreen';
import { stagger, fadeUp, scaleIn } from '../motion/presets';

const SUCCESS_RESET_MS = 2800;

const emptyForm = (defaultCategory = 'Other') => ({
  Amount: '',
  Category: defaultCategory,
  Date: todayIsoDate(),
  Merchant: '',
  Card: '',
  Notes: '',
});

const AddTransaction = () => {
  const { config, loading, syncError, refresh, setTransactions } = useData();
  const toast = useToast();
  const defaultCategory = config?.CATEGORIES?.[0]?.value ?? 'Other';

  const [formData, setFormData] = useState(() => emptyForm(defaultCategory));
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) setReceiptFile(file);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(emptyForm(defaultCategory));
    setReceiptFile(null);
  }, [defaultCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    let receiptUrl = null;
    if (receiptFile) {
      const upload = await uploadReceipt(receiptFile, formData.Date);
      if (upload.ok) {
        receiptUrl = upload.receiptUrl;
      } else {
        toast.error('Receipt upload failed', {
          description: `${upload.error}. Saving transaction without it.`,
        });
      }
    }

    const payload = {
      ...formData,
      Amount: parseFloat(formData.Amount) || 0,
      Category: formData.Category || defaultCategory,
      ...(receiptUrl && { ReceiptUrl: receiptUrl }),
    };

    const { ok, data, error } = await saveTransaction(payload);
    setIsSubmitting(false);

    if (!ok) {
      setSubmitError(error || 'Could not save this transaction. Try again.');
      toast.error('Save failed', { description: error });
      return;
    }

    const saved = data?.transaction ?? payload;
    setTransactions((prev) => [{ ...saved, id: saved.id ?? `local-${Date.now()}` }, ...prev]);
    toast.success('Transaction saved', { description: payload.Merchant || 'New entry added' });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      resetForm();
    }, SUCCESS_RESET_MS);
  };

  const cardOptions = useMemo(() => Object.keys(config?.CARDS ?? {}), [config]);

  if (!config && loading) return <LoadingScreen label="Preparing form" />;
  if (!config) {
    return (
      <PageError
        variant="network"
        title="We need your settings first"
        description={syncError ?? 'Could not load this profile\'s configuration.'}
        onRetry={refresh}
        retrying={loading}
      />
    );
  }

  return (
    <motion.div className="form-page" variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Manual entry"
        title="Add transaction"
        subtitle="Log a purchase that did not come from your wallet shortcut."
      />

      <motion.div className="card form-card glass-panel" variants={fadeUp}>
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div key="ok" className="success-panel" {...scaleIn}>
              <CheckCircle size={56} className="success-icon" strokeWidth={1.5} />
              <h2 className="page-title" style={{ fontSize: '1.5rem' }}>Saved</h2>
              <p className="page-subtitle">Your transaction is in the ledger.</p>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} {...scaleIn}>
              <AnimatePresence>
                {submitError && (
                  <motion.div
                    className="inline-error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    role="alert"
                  >
                    {submitError}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="form-group">
                <label className="form-label">Merchant</label>
                <input
                  type="text"
                  name="Merchant"
                  className="form-input"
                  placeholder="Where did you spend?"
                  value={formData.Merchant}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    name="Amount"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={formData.Amount}
                    onChange={handleChange}
                    required
                  />
                </div>
                <DateField label="Date" name="Date" value={formData.Date} onChange={handleChange} />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    name="Category"
                    className="form-input"
                    value={formData.Category}
                    onChange={handleChange}
                    required
                  >
                    {config.CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Card</label>
                  <select name="Card" className="form-input" value={formData.Card} onChange={handleChange}>
                    <option value="">Select card</option>
                    {cardOptions.map((card) => (
                      <option key={card} value={card}>{card}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  name="Notes"
                  className="form-input"
                  placeholder="Optional"
                  value={formData.Notes}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Receipt</label>
                <label className={`upload-zone ${receiptFile ? 'upload-zone-active' : ''}`}>
                  {receiptFile ? <ImageIcon size={20} /> : <Upload size={20} />}
                  <span>{receiptFile ? receiptFile.name : 'Tap to upload'}</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : <>Save transaction <ArrowRight size={18} /></>}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default AddTransaction;
