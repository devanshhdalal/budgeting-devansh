import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Calendar, RefreshCw } from 'lucide-react';
import { saveConfig } from '../services/storage';
import { useData } from '../hooks/useData';
import { useToast } from '../hooks/useToast';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import PageError from '../components/ui/PageError';
import SyncBanner from '../components/ui/SyncBanner';
import DateField from '../components/DateField';
import LoadingScreen from '../components/layout/LoadingScreen';
import { CategoryIcon } from '../utils/categoryIcons';
import { formatCurrency } from '../utils/format';
import { formatDisplayDate, todayIsoDate } from '../utils/date';
import {
  formatRenewalLabel,
  getSubscriptions,
  newSubscriptionId,
  renewalUrgency,
  sortByRenewal,
  subscriptionMonthlyTotal,
} from '../utils/subscriptions';
import { getPageErrorTitle, getPageErrorVariant } from '../utils/apiErrors';
import { stagger, fadeUp } from '../motion/presets';

const emptyForm = () => ({
  id: '',
  name: '',
  amount: '',
  renewalDate: todayIsoDate(),
  card: '',
  notes: '',
});

const SubscriptionRow = ({ sub, categories, onEdit, onDelete }) => {
  const urgency = renewalUrgency(sub.renewalDate);
  return (
    <motion.div className="sub-row sub-row-managed" layout variants={fadeUp}>
      <div className="sub-row-left">
        <div className="sub-icon">
          <CategoryIcon category="Subscriptions" categories={categories} />
        </div>
        <div>
          <div className="sub-name">{sub.name}</div>
          <div className="sub-renewal-meta">
            <Calendar size={12} aria-hidden />
            <span>{formatDisplayDate(sub.renewalDate)}</span>
            <span className={`sub-renewal-badge sub-renewal-${urgency}`}>
              {formatRenewalLabel(sub.renewalDate)}
            </span>
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
          <button type="button" className="action-btn action-btn-danger" onClick={() => onDelete(sub)} aria-label={`Delete ${sub.name}`}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const SubscriptionsPage = () => {
  const { config, setConfig, loading, syncError, syncStatus, refresh } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const subscriptions = useMemo(() => sortByRenewal(getSubscriptions(config)), [config]);
  const monthlyTotal = useMemo(() => subscriptionMonthlyTotal(subscriptions), [subscriptions]);
  const cardOptions = useMemo(() => Object.keys(config?.CARDS ?? {}), [config]);

  const persist = useCallback(
    async (nextSubs) => {
      if (!config) return false;
      setIsSaving(true);
      const nextConfig = { ...config, SUBSCRIPTIONS: nextSubs };
      const { ok, error } = await saveConfig(nextConfig);
      setIsSaving(false);
      if (!ok) {
        toast.error('Save failed', { description: error });
        return false;
      }
      setConfig(nextConfig);
      return true;
    },
    [config, setConfig, toast]
  );

  const openAdd = () => {
    setForm(emptyForm());
    setIsAdding(true);
    setEditing(null);
    setFormError(null);
  };

  const openEdit = (sub) => {
    setForm({
      id: sub.id,
      name: sub.name,
      amount: String(sub.amount ?? ''),
      renewalDate: sub.renewalDate || todayIsoDate(),
      card: sub.card || '',
      notes: sub.notes || '',
    });
    setIsAdding(false);
    setEditing(sub);
    setFormError(null);
  };

  const closeModal = () => {
    setEditing(null);
    setIsAdding(false);
    setForm(emptyForm());
    setFormError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const amount = parseFloat(form.amount);
    if (!name) {
      setFormError('Subscription name is required');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter a valid monthly amount');
      return;
    }
    if (!form.renewalDate) {
      setFormError('Renewal date is required');
      return;
    }

    const entry = {
      id: isAdding ? newSubscriptionId() : form.id,
      name,
      amount,
      renewalDate: form.renewalDate,
      ...(form.card && { card: form.card }),
      ...(form.notes?.trim() && { notes: form.notes.trim() }),
    };

    const current = getSubscriptions(config);
    const next = isAdding
      ? [...current, entry]
      : current.map((s) => (s.id === entry.id ? entry : s));

    const ok = await persist(next);
    if (ok) {
      toast.success(isAdding ? 'Subscription added' : 'Subscription updated');
      closeModal();
    }
  };

  const handleDelete = async (sub) => {
    if (!window.confirm(`Remove ${sub.name}?`)) return;
    const next = getSubscriptions(config).filter((s) => s.id !== sub.id);
    const ok = await persist(next);
    if (ok) {
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

  const showModal = isAdding || editing;

  return (
    <motion.div className="subscriptions-page" variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Recurring"
        title="Subscriptions"
        subtitle="Track monthly services and upcoming renewal dates."
        action={
          <button type="button" className="btn btn-primary" onClick={openAdd} disabled={isSaving}>
            <Plus size={18} />
            <span className="hide-mobile">Add subscription</span>
          </button>
        }
      />

      {syncError && (
        <SyncBanner message={`${syncError}. Showing cached settings.`} onRetry={handleRetry} retrying={loading} />
      )}

      <motion.div variants={fadeUp}>
        <SectionCard
          title="Monthly total"
          action={<span className="sub-amount sub-amount-lg">{formatCurrency(monthlyTotal)}/mo</span>}
        >
          {subscriptions.length === 0 ? (
            <div className="subscriptions-empty">
              <RefreshCw size={32} strokeWidth={1.5} />
              <p>No subscriptions yet</p>
              <button type="button" className="btn btn-secondary" onClick={openAdd}>
                Add your first subscription
              </button>
            </div>
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
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="modal-content"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
                <X size={22} />
              </button>
              <h2 className="page-title" style={{ fontSize: '1.25rem', marginBottom: '20px' }}>
                {isAdding ? 'Add subscription' : 'Edit subscription'}
              </h2>

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
                  label="Next renewal"
                  name="renewalDate"
                  value={form.renewalDate}
                  onChange={handleChange}
                />
              </div>

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

              {formError && (
                <p className="inline-error" role="alert" style={{ marginBottom: 12 }}>
                  {formError}
                </p>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                {!isAdding && (
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => handleDelete(editing)}>
                    <Trash2 size={18} /> Delete
                  </button>
                )}
                <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving…' : isAdding ? 'Add subscription' : 'Save changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SubscriptionsPage;
