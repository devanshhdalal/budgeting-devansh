import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { saveConfig } from '@/services/storage';
import { useData } from '@/hooks/useData';
import { useToast } from '@/hooks/useToast';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useConfirm } from '@/hooks/useConfirm';
import PageHeader from '@/components/ui/PageHeader';
import SectionCard from '@/components/ui/SectionCard';
import PageError from '@/components/ui/PageError';
import SyncBanner from '@/components/ui/SyncBanner';
import SaveIndicator from '@/components/ui/SaveIndicator';
import Modal from '@/components/ui/Modal';
import DateField from '@/components/forms/DateField';
import LoadingScreen from '@/components/layout/LoadingScreen';
import { CategoryIcon } from '@/utils/categoryIcons';
import { formatCurrency } from '@/utils/format';
import { formatDisplayDate, todayIsoDate } from '@/utils/date';
import EmptyState from '@/components/ui/EmptyState';
import {
  formatRenewalLabel,
  getSubscriptions,
  newSubscriptionId,
  nextRenewalFromStart,
  renewalUrgency,
  resolveSubscriptionStartDate,
  sortByRenewal,
  subscriptionMonthlyTotal,
} from '@/utils/subscriptions';
import { getPageErrorTitle, getPageErrorVariant } from '@/utils/apiErrors';

const emptyForm = () => ({
  id: '',
  name: '',
  amount: '',
  startDate: todayIsoDate(),
  card: '',
  notes: '',
});

const buildSubscriptionEntry = (form, { isNew }) => {
  const name = form.name.trim();
  const amount = parseFloat(form.amount);
  if (!name || !Number.isFinite(amount) || amount <= 0 || !form.startDate) return null;

  const startDate = form.startDate;
  return {
    id: form.id || (isNew ? newSubscriptionId() : ''),
    name,
    amount,
    startDate,
    renewalDate: nextRenewalFromStart(startDate),
    ...(form.card && { card: form.card }),
    ...(form.notes?.trim() && { notes: form.notes.trim() }),
  };
};

const SubscriptionRow = ({ sub, categories, onEdit, onDelete }) => {
  const urgency = renewalUrgency(sub.renewalDate);
  const fromTransaction = sub.source === 'transaction';

  return (
    <motion.div className="sub-row sub-row-managed" layout>
      <div className="sub-row-left">
        <div className="sub-icon">
          <CategoryIcon category="Subscriptions" categories={categories} />
        </div>
        <div>
          <div className="sub-name">{sub.name}</div>
          <div className="sub-renewal-meta">
            <Calendar size={12} aria-hidden />
            <span>Next {formatDisplayDate(sub.renewalDate)}</span>
            <span className={`sub-renewal-badge sub-renewal-${urgency}`}>
              {formatRenewalLabel(sub.renewalDate)}
            </span>
            {fromTransaction && <span className="sub-source-badge">From transaction</span>}
          </div>
          {sub.card && <div className="sub-tag">{sub.card}</div>}
        </div>
      </div>
      <div className="sub-row-right">
        <span className="sub-amount">{formatCurrency(sub.amount)}</span>
        <div className="sub-row-actions">
          <button type="button" className="action-btn" onClick={() => onEdit(sub)} aria-label={`Edit ${sub.name}`}>
            <Pencil size={16} />
          </button>
          {!fromTransaction && (
            <button type="button" className="action-btn action-btn-danger" onClick={() => onDelete(sub)} aria-label={`Delete ${sub.name}`}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const SubscriptionsPage = () => {
  const { config, transactions, setConfig, loading, syncError, syncStatus, refresh } = useData();
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const formRef = useRef(form);
  const [saveStatus, setSaveStatus] = useState('idle');
  const savedTimerRef = useRef(null);
  const configRef = useRef(config);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const subscriptions = useMemo(
    () => sortByRenewal(getSubscriptions(config, transactions)),
    [config, transactions]
  );
  const monthlyTotal = useMemo(() => subscriptionMonthlyTotal(subscriptions), [subscriptions]);
  const cardOptions = useMemo(() => Object.keys(config?.CARDS ?? {}), [config]);

  const previewRenewal = useMemo(() => {
    if (!form.startDate) return null;
    return nextRenewalFromStart(form.startDate);
  }, [form.startDate]);

  const markSaved = useCallback((ok) => {
    setSaveStatus(ok ? 'saved' : 'error');
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    if (ok) savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
  }, []);

  useEffect(
    () => () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    []
  );

  const persist = useCallback(
    async (nextSubs) => {
      const cfg = configRef.current;
      if (!cfg) return false;
      setSaveStatus('saving');
      const nextConfig = { ...cfg, SUBSCRIPTIONS: nextSubs };
      const { ok, error } = await saveConfig(nextConfig);
      if (!ok) {
        markSaved(false);
        toast.error('Save failed', { description: error });
        return false;
      }
      setConfig(nextConfig);
      markSaved(true);
      return true;
    },
    [markSaved, setConfig, toast]
  );

  const autoSaveForm = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg) return;

    const entry = buildSubscriptionEntry(formRef.current, { isNew: isAdding && !formRef.current.id });
    if (!entry) return;

    const manual = Array.isArray(cfg.SUBSCRIPTIONS) ? cfg.SUBSCRIPTIONS : [];
    const exists = manual.some((s) => s.id === entry.id);
    const next = exists
      ? manual.map((s) => (s.id === entry.id ? entry : s))
      : [...manual, entry];

    const ok = await persist(next);
    if (ok && isAdding) {
      setIsAdding(false);
      setForm((prev) => ({ ...prev, id: entry.id }));
      setEditing(entry);
    }
  }, [isAdding, persist]);

  const { debounced: debouncedAutoSave } = useDebouncedCallback(autoSaveForm, 500);

  const showModal = isAdding || editing;

  useEffect(() => {
    if (!showModal) return;
    debouncedAutoSave();
  }, [form, showModal, debouncedAutoSave]);

  const openAdd = () => {
    setForm(emptyForm());
    setIsAdding(true);
    setEditing(null);
  };

  const openEdit = (sub) => {
    setForm({
      id: sub.source === 'transaction' ? '' : sub.id,
      name: sub.name,
      amount: String(sub.amount ?? ''),
      startDate: resolveSubscriptionStartDate(sub) || todayIsoDate(),
      card: sub.card || '',
      notes: sub.notes || '',
    });
    setIsAdding(sub.source === 'transaction');
    setEditing(sub.source === 'transaction' ? null : sub);
  };

  const closeModal = () => {
    setEditing(null);
    setIsAdding(false);
    setForm(emptyForm());
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (sub) => {
    const ok = await confirm({
      title: `Remove ${sub.name}?`,
      message: 'This subscription will be removed from your tracking list.',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    const manual = Array.isArray(config?.SUBSCRIPTIONS) ? config.SUBSCRIPTIONS : [];
    const next = manual.filter((s) => s.id !== sub.id);
    const saved = await persist(next);
    if (saved) {
      toast.success('Subscription removed');
      if (editing?.id === sub.id) closeModal();
    }
  };

  const handleRetry = async () => {
    const result = await refresh();
    if (!result?.ok) toast.error('Sync failed', { description: syncError });
  };

  if (!config && loading) return <LoadingScreen label="Loading subscriptions" />;
  if (!config) {
    return (
      <PageError
        variant={getPageErrorVariant(syncStatus)}
        title={getPageErrorTitle(syncStatus)}
        description={syncError ?? 'No configuration found for this profile.'}
        onRetry={handleRetry}
        retrying={loading}
      />
    );
  }

  return (
    <div className="subscriptions-page">
      <PageHeader
        eyebrow="Recurring"
        title="Subscriptions"
        subtitle="Track renewals and monthly costs in one place."
        action={
          <button type="button" className="btn btn-primary" onClick={openAdd} disabled={saveStatus === 'saving'}>
            <Plus size={18} />
            <span className="hide-mobile">Add subscription</span>
          </button>
        }
      />

      {syncError && (
        <SyncBanner message={`${syncError}. Showing cached settings.`} onRetry={handleRetry} retrying={loading} />
      )}

      <SectionCard
        title="Monthly total"
        action={<span className="sub-amount sub-amount-lg">{formatCurrency(monthlyTotal)}/mo</span>}
      >
        {subscriptions.length === 0 ? (
          <EmptyState title="No subscriptions yet">
            <p className="empty-state-hint">
              Add one manually, or categorize a transaction as Subscriptions.
            </p>
            <button type="button" className="btn btn-secondary" onClick={openAdd}>
              Add your first subscription
            </button>
          </EmptyState>
        ) : (
          <div className="sub-list">
            {subscriptions.map((sub) => (
              <SubscriptionRow
                key={sub.id}
                sub={sub}
                categories={config.CATEGORIES}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={isAdding ? 'Add subscription' : 'Edit subscription'}
        titleExtra={<SaveIndicator status={saveStatus} />}
      >
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            className="form-input"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Netflix, Spotify, iCloud..."
          />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Monthly amount (CAD)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>
          <DateField
            label="Starts"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
          />
        </div>

        {previewRenewal && (
          <p className="form-hint sub-renewal-preview">
            Next renewal · {formatDisplayDate(previewRenewal)} · {formatRenewalLabel(previewRenewal)}
          </p>
        )}

        <div className="form-group">
          <label className="form-label">Payment card (optional)</label>
          <select className="form-input" name="card" value={form.card} onChange={handleChange}>
            <option value="">None</option>
            {cardOptions.map((card) => (
              <option key={card} value={card}>{card}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <input
            className="form-input"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Family plan, annual billing, etc."
          />
        </div>

        {!isAdding && editing && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => handleDelete(editing)}
          >
            <Trash2 size={18} /> Delete subscription
          </button>
        )}
      </Modal>
      {confirmDialog}
    </div>
  );
};

export default SubscriptionsPage;
