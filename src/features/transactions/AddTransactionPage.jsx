import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { saveTransaction, uploadReceipt } from '@/services/storage';
import { todayIsoDate } from '@/utils/date';
import { getErrorCopy, getPageErrorTitle, getPageErrorVariant } from '@/utils/apiErrors';
import { useData } from '@/hooks/useData';
import { useToast } from '@/hooks/useToast';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import TransactionForm from '@/features/transactions/components/TransactionForm';
import Stepper, { Step } from '@/components/ui/Stepper';
import PageHeader from '@/components/ui/PageHeader';
import PageError from '@/components/ui/PageError';
import SyncBanner from '@/components/ui/SyncBanner';
import SaveIndicator from '@/components/ui/SaveIndicator';
import LoadingScreen from '@/components/layout/LoadingScreen';
import { stagger, fadeUp, scaleIn } from '@/motion/presets';

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

const formatCurrency = (value) => {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Math.abs(n));
};

const TransactionReview = ({ formData, config, isRefund, foreignAmount, foreignCurrency, receiptFile }) => {
  const categoryLabel =
    config.CATEGORIES.find((c) => c.value === formData.Category)?.label ?? formData.Category;

  return (
    <div className="review-grid">
      <div className="review-row">
        <span className="review-label">Merchant</span>
        <span className="review-value">{formData.Merchant || '—'}</span>
      </div>
      <div className="review-row">
        <span className="review-label">Amount</span>
        <span className={`review-value review-amount${isRefund ? ' refund' : ''}`}>
          {isRefund ? '+' : ''}{formatCurrency(formData.Amount)}
          {isRefund && <span style={{ fontSize: '0.75rem', marginLeft: 6 }}>refund</span>}
        </span>
      </div>
      <div className="review-row">
        <span className="review-label">Date</span>
        <span className="review-value">{formData.Date}</span>
      </div>
      <div className="review-row">
        <span className="review-label">Category</span>
        <span className="review-value">{categoryLabel}</span>
      </div>
      <div className="review-row">
        <span className="review-label">Card</span>
        <span className="review-value">{formData.Card || 'None'}</span>
      </div>
      {foreignAmount && (
        <div className="review-row">
          <span className="review-label">Foreign</span>
          <span className="review-value">
            {foreignAmount} {foreignCurrency || '—'}
          </span>
        </div>
      )}
      {formData.Notes && (
        <div className="review-row">
          <span className="review-label">Notes</span>
          <span className="review-value">{formData.Notes}</span>
        </div>
      )}
      {receiptFile && (
        <div className="review-row">
          <span className="review-label">Receipt</span>
          <span className="review-value">{receiptFile.name}</span>
        </div>
      )}
    </div>
  );
};

const AddTransaction = () => {
  const { config, loading, syncError, syncStatus, refresh, setTransactions } = useData();
  const toast = useToast();
  const defaultCategory = config?.CATEGORIES?.[0]?.value ?? 'Other';

  const [formKey, setFormKey] = useState(0);
  const [formData, setFormData] = useState(() => emptyForm(defaultCategory));
  const formRef = useRef(formData);
  const [savedTxId, setSavedTxId] = useState(null);
  const [isRefund, setIsRefund] = useState(false);
  const isRefundRef = useRef(isRefund);
  const [foreignAmount, setForeignAmount] = useState('');
  const [foreignCurrency, setForeignCurrency] = useState('');
  const foreignRef = useRef({ foreignAmount: '', foreignCurrency: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [stepError, setStepError] = useState(null);

  useEffect(() => {
    formRef.current = formData;
  }, [formData]);

  useEffect(() => {
    isRefundRef.current = isRefund;
  }, [isRefund]);

  useEffect(() => {
    foreignRef.current = { foreignAmount, foreignCurrency };
  }, [foreignAmount, foreignCurrency]);

  const buildPayload = useCallback(() => {
    const form = formRef.current;
    if (!form.Merchant.trim()) return null;
    const amount = parseFloat(form.Amount);
    if (!Number.isFinite(amount) || amount === 0) return null;
    if (!form.Date) return null;

    const signedAmount = isRefundRef.current ? -Math.abs(amount) : Math.abs(amount);
    const { foreignAmount: fa, foreignCurrency: fc } = foreignRef.current;

    return {
      ...(savedTxId && { id: savedTxId }),
      ...form,
      Amount: signedAmount,
      Category: form.Category || defaultCategory,
      IsRefund: isRefundRef.current,
      Source: 'manual',
      Currency: 'CAD',
      ...(fa && { ForeignAmount: parseFloat(fa) }),
      ...(fc && { ForeignCurrency: fc }),
    };
  }, [defaultCategory, savedTxId]);

  const persistTransaction = useCallback(
    async ({ quiet = true } = {}) => {
      const payload = buildPayload();
      if (!payload) return false;

      setSaveStatus('saving');
      const { ok, data, error, status, code } = await saveTransaction(payload);

      if (!ok) {
        setSaveStatus('error');
        const msg = getErrorCopy({ status, code, error });
        if (!quiet) setSubmitError(msg);
        if (!quiet) toast.error('Save failed', { description: msg });
        return false;
      }

      const saved = data?.transaction ?? payload;
      const id = saved.id ?? savedTxId ?? `local-${crypto.randomUUID()}`;
      const record = { ...saved, id };
      setSavedTxId(id);
      setTransactions((prev) => {
        const exists = prev.some((t) => t.id === id);
        if (exists) return prev.map((t) => (t.id === id ? record : t));
        return [record, ...prev];
      });
      setSaveStatus('saved');
      if (!quiet) toast.success('Transaction saved', { description: payload.Merchant || 'New entry added' });
      return true;
    },
    [buildPayload, savedTxId, setTransactions, toast]
  );

  const { debounced: debouncedPersist, flush: flushPersist } = useDebouncedCallback(
    () => persistTransaction({ quiet: true }),
    500
  );

  const schedulePersist = useCallback(() => {
    debouncedPersist();
  }, [debouncedPersist]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      formRef.current = next;
      return next;
    });
    setStepError(null);
    schedulePersist();
  }, [schedulePersist]);

  const handleForeignChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === 'ForeignAmount') setForeignAmount(value);
    if (name === 'ForeignCurrency') setForeignCurrency(value);
    setStepError(null);
    schedulePersist();
  }, [schedulePersist]);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const date = formRef.current.Date || todayIsoDate();
    setSaveStatus('saving');
    const upload = await uploadReceipt(file, date);
    if (!upload.ok) {
      setSaveStatus('error');
      toast.error('Receipt upload failed', { description: upload.error });
      return;
    }

    setFormData((prev) => {
      const next = { ...prev, ReceiptUrl: upload.receiptUrl };
      formRef.current = next;
      return next;
    });
    await persistTransaction({ quiet: true });
  }, [persistTransaction, toast]);

  const resetForm = useCallback(() => {
    setFormData(emptyForm(defaultCategory));
    formRef.current = emptyForm(defaultCategory);
    setSavedTxId(null);
    setIsRefund(false);
    setForeignAmount('');
    setForeignCurrency('');
    setSubmitError(null);
    setStepError(null);
    setSaveStatus('idle');
    setFormKey((k) => k + 1);
  }, [defaultCategory]);

  const handleRetry = async () => {
    const result = await refresh();
    if (!result?.ok) toast.error('Sync failed', { description: syncError });
  };

  const validateStep = useCallback(
    (step) => {
      if (step === 1) {
        if (!formData.Merchant.trim()) {
          setStepError('Enter a merchant name.');
          return false;
        }
        const amount = parseFloat(formData.Amount);
        if (!Number.isFinite(amount) || amount === 0) {
          setStepError('Enter an amount greater than $0.');
          return false;
        }
        if (!formData.Date) {
          setStepError('Pick a date.');
          return false;
        }
      }

      if (step === 3 && foreignAmount && !foreignCurrency.trim()) {
        setStepError('Add a currency code for the foreign amount.');
        return false;
      }

      setStepError(null);
      return true;
    },
    [formData, foreignAmount, foreignCurrency]
  );

  const handleStepAdvance = async (step) => {
    if (!validateStep(step)) return false;
    await flushPersist();
    return true;
  };

  const handleFinalStep = async () => {
    if (!validateStep(1)) return false;
    setIsSubmitting(true);
    setSubmitError(null);
    const ok = await persistTransaction({ quiet: false });
    setIsSubmitting(false);
    if (!ok) return false;

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      resetForm();
    }, SUCCESS_RESET_MS);
    return true;
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
        subtitle="Changes save automatically as you fill in each field."
        action={<SaveIndicator status={isSubmitting ? 'saving' : saveStatus} />}
      />

      {syncError && (
        <SyncBanner
          message={`${syncError}. Showing cached settings.`}
          onRetry={handleRetry}
          retrying={loading}
        />
      )}

      <motion.div variants={fadeUp}>
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div key="ok" className="card form-card glass-panel success-panel" {...scaleIn}>
              <CheckCircle size={56} className="success-icon" strokeWidth={1.5} />
              <h2 className="page-title" style={{ fontSize: '1.5rem' }}>Saved</h2>
              <p className="page-subtitle">Your transaction is in the ledger.</p>
            </motion.div>
          ) : (
            <motion.div key="stepper" {...scaleIn}>
              <AnimatePresence>
                {(submitError || stepError) && (
                  <motion.div
                    className="inline-error"
                    style={{ marginBottom: 16 }}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    role="alert"
                  >
                    {submitError || stepError}
                  </motion.div>
                )}
              </AnimatePresence>

              <Stepper
                key={formKey}
                initialStep={1}
                onBeforeNext={handleStepAdvance}
                onFinalStepCompleted={handleFinalStep}
                backButtonText="Back"
                nextButtonText="Continue"
                completeButtonText={isSubmitting ? 'Finishing…' : 'Done'}
                nextButtonProps={{ disabled: isSubmitting }}
                backButtonProps={{ disabled: isSubmitting }}
              >
                <Step>
                  <div className="step-heading">
                    <h2>What did you spend?</h2>
                    <p>Merchant, amount, and date for this purchase.</p>
                  </div>
                  <TransactionForm
                    step={1}
                    formData={formData}
                    onChange={handleChange}
                    config={config}
                    showRefund
                    isRefund={isRefund}
                    onRefundToggle={(value) => {
                      setIsRefund(value);
                      schedulePersist();
                    }}
                    showReceipt={false}
                  />
                </Step>

                <Step>
                  <div className="step-heading">
                    <h2>How should we categorize it?</h2>
                    <p>Pick a category and payment method.</p>
                  </div>
                  <TransactionForm
                    step={2}
                    formData={formData}
                    onChange={handleChange}
                    config={config}
                    showReceipt={false}
                  />
                </Step>

                <Step>
                  <div className="step-heading">
                    <h2>Anything else?</h2>
                    <p>Foreign currency, notes, and receipt are optional.</p>
                  </div>
                  <TransactionForm
                    step={3}
                    formData={formData}
                    onChange={handleChange}
                    onFileChange={handleFileChange}
                    config={config}
                    showForeign
                    foreignAmount={foreignAmount}
                    foreignCurrency={foreignCurrency}
                    onForeignChange={handleForeignChange}
                  />
                </Step>

                <Step>
                  <div className="step-heading">
                    <h2>Review</h2>
                    <p>Your transaction is already saved — confirm and finish.</p>
                  </div>
                  <TransactionReview
                    formData={formData}
                    config={config}
                    isRefund={isRefund}
                    foreignAmount={foreignAmount}
                    foreignCurrency={foreignCurrency}
                    receiptFile={formData.ReceiptUrl ? { name: 'Receipt uploaded' } : null}
                  />
                </Step>
              </Stepper>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default AddTransaction;
