import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { saveTransaction, uploadReceipt } from '../services/storage';
import { todayIsoDate } from '../utils/date';
import { getErrorCopy, getPageErrorTitle, getPageErrorVariant } from '../utils/apiErrors';
import { useData } from '../hooks/useData';
import { useToast } from '../hooks/useToast';
import TransactionForm from '../components/TransactionForm';
import PageHeader from '../components/ui/PageHeader';
import PageError from '../components/ui/PageError';
import SyncBanner from '../components/ui/SyncBanner';
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
  Source: 'manual',
});

const AddTransaction = () => {
  const { config, loading, syncError, syncStatus, refresh, setTransactions } = useData();
  const toast = useToast();
  const defaultCategory = config?.CATEGORIES?.[0]?.value ?? 'Other';

  const [formData, setFormData] = useState(() => emptyForm(defaultCategory));
  const [receiptFile, setReceiptFile] = useState(null);
  const [isRefund, setIsRefund] = useState(false);
  const [foreignAmount, setForeignAmount] = useState('');
  const [foreignCurrency, setForeignCurrency] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleForeignChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === 'ForeignAmount') setForeignAmount(value);
    if (name === 'ForeignCurrency') setForeignCurrency(value);
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) setReceiptFile(file);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(emptyForm(defaultCategory));
    setReceiptFile(null);
    setIsRefund(false);
    setForeignAmount('');
    setForeignCurrency('');
  }, [defaultCategory]);

  const handleRetry = async () => {
    const result = await refresh();
    if (!result?.ok) toast.error('Sync failed', { description: syncError });
  };

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

    const amount = parseFloat(formData.Amount);
    if (!Number.isFinite(amount) || amount === 0) {
      setIsSubmitting(false);
      const msg = 'Enter an amount greater than $0.';
      setSubmitError(msg);
      toast.error('Invalid amount', { description: msg });
      return;
    }

    const signedAmount = isRefund ? -Math.abs(amount) : Math.abs(amount);

    const payload = {
      ...formData,
      Amount: signedAmount,
      Category: formData.Category || defaultCategory,
      IsRefund: isRefund,
      Source: 'manual',
      Currency: 'CAD',
      ...(foreignAmount && { ForeignAmount: parseFloat(foreignAmount) }),
      ...(foreignCurrency && { ForeignCurrency: foreignCurrency }),
      ...(receiptUrl && { ReceiptUrl: receiptUrl }),
    };

    const { ok, data, error, status, code } = await saveTransaction(payload);
    setIsSubmitting(false);

    if (!ok) {
      const msg = getErrorCopy({ status, code, error });
      setSubmitError(msg);
      toast.error('Save failed', { description: msg });
      return;
    }

    const saved = data?.transaction ?? payload;
    setTransactions((prev) => [
      { ...saved, id: saved.id ?? `local-${crypto.randomUUID()}` },
      ...prev,
    ]);
    toast.success('Transaction saved', { description: payload.Merchant || 'New entry added' });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      resetForm();
    }, SUCCESS_RESET_MS);
  };

  if (!config && loading) return <LoadingScreen label="Preparing form" />;
  if (!config) {
    return (
      <PageError
        variant={getPageErrorVariant(syncStatus)}
        title={getPageErrorTitle(syncStatus)}
        description={syncError ?? "Could not load this profile's configuration."}
        onRetry={handleRetry}
        retrying={loading}
      />
    );
  }

  return (
    <motion.div className="form-page" variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Manual entry"
        title="Add transaction"
        subtitle="Log cash, card, or other spending not captured by a Shortcut."
      />

      {syncError && (
        <SyncBanner
          message={`${syncError}. Showing cached settings.`}
          onRetry={handleRetry}
          retrying={loading}
        />
      )}

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
              <TransactionForm
                formData={formData}
                onChange={handleChange}
                onFileChange={handleFileChange}
                receiptFile={receiptFile}
                config={config}
                showRefund
                showForeign
                isRefund={isRefund}
                onRefundToggle={setIsRefund}
                foreignAmount={foreignAmount}
                foreignCurrency={foreignCurrency}
                onForeignChange={handleForeignChange}
              />
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
