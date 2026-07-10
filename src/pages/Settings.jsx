import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CreditCard, DollarSign, X } from 'lucide-react';
import { saveConfig, uploadCardImage } from '../services/storage';
import { useData } from '../hooks/useData';
import { useToast } from '../hooks/useToast';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { inferNetworkFromName } from '../config/cardNetworks';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import PageError from '../components/ui/PageError';
import SyncBanner from '../components/ui/SyncBanner';
import SaveIndicator from '../components/ui/SaveIndicator';
import CardImageUpload from '../components/settings/CardImageUpload';
import PaymentCardTile, { NetworkPicker } from '../components/settings/PaymentCardTile';
import DateField from '../components/DateField';
import { resolveBillingPeriod } from '../utils/billingCycle';
import { formatDisplayDate } from '../utils/date';
import { getPageErrorTitle, getPageErrorVariant } from '../utils/apiErrors';
import LoadingScreen from '../components/layout/LoadingScreen';
import { stagger } from '../motion/presets';

const cloneConfig = (config) => structuredClone(config);

const SettingsForm = ({ initialConfig, commitConfig }) => {
  const toast = useToast();
  const [draft, setDraft] = useState(() => cloneConfig(initialConfig));
  const draftRef = useRef(draft);

  const [editingCard, setEditingCard] = useState(null);
  const editingCardRef = useRef(editingCard);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    editingCardRef.current = editingCard;
  }, [editingCard]);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isUploadingCard, setIsUploadingCard] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const savedTimerRef = useRef(null);

  const markSaved = useCallback((ok) => {
    setSaveStatus(ok ? 'saved' : 'error');
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    if (ok) {
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, []);

  useEffect(
    () => () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    []
  );

  const persistDraft = useCallback(
    async (nextDraft, successMessage) => {
      setSaveStatus('saving');
      const { ok, error } = await saveConfig(nextDraft);
      if (!ok) {
        markSaved(false);
        toast.error('Save failed', { description: error });
        return false;
      }
      setDraft(nextDraft);
      commitConfig(nextDraft);
      markSaved(true);
      if (successMessage) toast.success(successMessage);
      return true;
    },
    [commitConfig, markSaved, toast]
  );

  const { debounced: debouncedPersist } = useDebouncedCallback(
    (nextDraft) => persistDraft(nextDraft, null),
    400
  );

  const updateBudget = (category, value) => {
    const nextDraft = {
      ...draftRef.current,
      BUDGET_CONFIG: { ...draftRef.current.BUDGET_CONFIG, [category]: parseFloat(value) || 0 },
    };
    setDraft(nextDraft);
    debouncedPersist(nextDraft);
  };

  const resetCardEditor = () => {
    setEditingCard(null);
    setPendingPreviewUrl(null);
    setCardError(null);
    setIsAddingNew(false);
  };

  const buildCardDraft = useCallback((card, baseDraft, { addingNew }) => {
    const name = card.name.trim();
    if (!name) return null;

    const isCash = name.toLowerCase() === 'cash';
    if (!isCash && !card.network) return null;
    if (addingNew && !isCash && !card.imageUrl) return null;

    const nextIdentifiers = { ...(baseDraft.CARD_IDENTIFIERS || {}) };
    Object.keys(nextIdentifiers).forEach((k) => {
      if (nextIdentifiers[k] === (card.originalName || card.name)) delete nextIdentifiers[k];
    });
    if (card.last4) nextIdentifiers[card.last4] = name;

    const nextCards = { ...baseDraft.CARDS };
    if (!addingNew && card.originalName && card.originalName !== name) {
      delete nextCards[card.originalName];
    }

    nextCards[name] = {
      currency: card.currency,
      multipliers: card.multipliers,
      ...(card.network && { network: card.network }),
      ...(card.imageUrl && { imageUrl: card.imageUrl }),
    };

    return {
      ...baseDraft,
      CARD_IDENTIFIERS: nextIdentifiers,
      CARDS: nextCards,
      BILLING_CYCLES: {
        ...(baseDraft.BILLING_CYCLES || {}),
        [name]: baseDraft.BILLING_CYCLES?.[card.originalName] || baseDraft.BILLING_CYCLES?.[name] || { type: 'monthly' },
      },
    };
  }, []);

  const persistCardFromEditor = useCallback(
    async (cardState = editingCardRef.current, addingNew = isAddingNew) => {
      const card = cardState;
      if (!card) return false;

      const nextDraft = buildCardDraft(card, draftRef.current, { addingNew });
      if (!nextDraft) return false;

      const ok = await persistDraft(nextDraft, addingNew ? 'Card added' : null);
      if (ok && addingNew) setIsAddingNew(false);
      return ok;
    },
    [buildCardDraft, isAddingNew, persistDraft]
  );

  const { debounced: debouncedCardPersist, flush: flushCardPersist } = useDebouncedCallback(
    () => persistCardFromEditor(),
    500
  );

  const patchEditingCard = (patch) => {
    setEditingCard((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      editingCardRef.current = next;
      return next;
    });
    debouncedCardPersist();
  };

  const handleCardImageSelect = async (file, url) => {
    setPendingPreviewUrl(url);
    setCardError(null);
    setIsUploadingCard(true);
    const upload = await uploadCardImage(file);
    setIsUploadingCard(false);
    if (!upload.ok) {
      setCardError(upload.error || 'Image upload failed');
      toast.error('Image upload failed', { description: upload.error });
      return;
    }
    setPendingPreviewUrl(null);
    patchEditingCard({ imageUrl: upload.imageUrl });
    flushCardPersist();
  };

  const openCardEditor = (name, data) => {
    const last4 = Object.entries(draft.CARD_IDENTIFIERS || {}).find(([, v]) => v === name)?.[0] || '';
    setEditingCard({
      name,
      originalName: name,
      ...data,
      network: data.network || inferNetworkFromName(name),
      last4,
    });
    setIsAddingNew(false);
    setPendingPreviewUrl(null);
    setCardError(null);
  };

  const openNewCardEditor = () => {
    const multipliers = Object.fromEntries(draft.CATEGORIES.map((c) => [c.value, 1]));
    multipliers.Base = 1;
    setEditingCard({
      name: '',
      originalName: '',
      currency: 'Points',
      multipliers,
      network: '',
      imageUrl: '',
      last4: '',
    });
    setIsAddingNew(true);
    setPendingPreviewUrl(null);
    setCardError(null);
  };

  const deleteCard = async (name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    const base = draftRef.current;
    const nextCards = { ...base.CARDS };
    delete nextCards[name];
    const nextCycles = { ...(base.BILLING_CYCLES || {}) };
    delete nextCycles[name];
    const nextDraft = { ...base, CARDS: nextCards, BILLING_CYCLES: nextCycles };
    const ok = await persistDraft(nextDraft, 'Card removed');
    if (ok) resetCardEditor();
  };

  const updateBillingCycle = async (cardName, nextCycle, successMessage = null) => {
    const nextDraft = {
      ...draftRef.current,
      BILLING_CYCLES: {
        ...(draftRef.current.BILLING_CYCLES || {}),
        [cardName]: nextCycle,
      },
    };
    await persistDraft(nextDraft, successMessage);
  };

  const setBillingType = (cardName, type) => {
    if (type === 'monthly') {
      updateBillingCycle(cardName, { type: 'monthly' });
      return;
    }
    const existing = draft.BILLING_CYCLES?.[cardName];
    const anchor = existing?.anchor
      ? { ...existing.anchor }
      : { statementStart: '', statementEnd: '', dueDate: '' };
    updateBillingCycle(cardName, { type: 'statement', anchor }, null);
  };

  const updateStatementAnchor = (cardName, field, value) => {
    const existing = draft.BILLING_CYCLES?.[cardName] || { type: 'statement', anchor: {} };
    const anchor = { ...(existing.anchor || {}), [field]: value };
    const complete = anchor.statementStart && anchor.statementEnd && anchor.dueDate;
    updateBillingCycle(cardName, { type: 'statement', anchor }, complete ? null : null);
  };

  return (
    <motion.div className="settings-page" variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle="Changes save automatically as you edit."
        action={<SaveIndicator status={saveStatus} />}
      />

      <div className="settings-grid">
        <SectionCard>
          <div className="settings-section-head">
            <div className="settings-section-icon settings-section-icon-accent">
              <DollarSign size={20} />
            </div>
            <div>
              <h2>Monthly budgets</h2>
              <p>Set spending limits per category</p>
            </div>
          </div>
          <div className="budget-slider-grid">
            {draft.CATEGORIES.map((cat) => (
              <div key={cat.value} className="budget-settings-row">
                <div className="budget-row-head">
                  <span>{cat.label}</span>
                  <span>${draft.BUDGET_CONFIG[cat.value] || 0}</span>
                </div>
                <input
                  type="range"
                  className="range-input"
                  min="0"
                  max="3000"
                  step="50"
                  value={draft.BUDGET_CONFIG[cat.value] || 0}
                  onChange={(e) => updateBudget(cat.value, e.target.value)}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="settings-section-head">
            <div className="settings-section-icon settings-section-icon-muted">
              <CreditCard size={20} />
            </div>
            <div>
              <h2>Payment methods</h2>
              <p>Add cards with a photo and payment network</p>
            </div>
          </div>
          <div className="card-grid">
            {Object.entries(draft.CARDS).map(([name, data]) => (
              <PaymentCardTile key={name} name={name} data={data} onClick={() => openCardEditor(name, data)} />
            ))}
            <button type="button" className="add-card-btn" onClick={openNewCardEditor}>
              <Plus size={20} />
              Add card
            </button>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="settings-section-head">
            <div className="settings-section-icon settings-section-icon-muted">
              <CreditCard size={20} />
            </div>
            <div>
              <h2>Billing cycles</h2>
              <p>Set one statement period per card — future dates are calculated automatically</p>
            </div>
          </div>
          <div className="billing-cycle-grid">
            {Object.keys(draft.CARDS).map((cardName) => {
              const cycle = draft.BILLING_CYCLES?.[cardName] || { type: 'monthly' };
              const isStatement = cycle.type === 'statement';
              const anchor = cycle.anchor || {};
              const preview = isStatement && anchor.statementStart && anchor.statementEnd && anchor.dueDate
                ? resolveBillingPeriod(cardName, new Date(), { [cardName]: cycle })
                : null;

              return (
                <div key={cardName} className="billing-cycle-card">
                  <div className="billing-cycle-head">
                    <span className="billing-cycle-name">{cardName}</span>
                    <select
                      className="form-input billing-cycle-type"
                      value={isStatement ? 'statement' : 'monthly'}
                      onChange={(e) => setBillingType(cardName, e.target.value)}
                      disabled={saveStatus === 'saving'}
                    >
                      <option value="monthly">Calendar month</option>
                      <option value="statement">Statement period</option>
                    </select>
                  </div>

                  {isStatement ? (
                    <div className="billing-cycle-fields">
                      <DateField
                        label="Statement opens"
                        name={`${cardName}-start`}
                        value={anchor.statementStart || ''}
                        onChange={(e) => updateStatementAnchor(cardName, 'statementStart', e.target.value)}
                        required={false}
                      />
                      <DateField
                        label="Statement closes"
                        name={`${cardName}-end`}
                        value={anchor.statementEnd || ''}
                        onChange={(e) => updateStatementAnchor(cardName, 'statementEnd', e.target.value)}
                        required={false}
                      />
                      <DateField
                        label="Payment due"
                        name={`${cardName}-due`}
                        value={anchor.dueDate || ''}
                        onChange={(e) => updateStatementAnchor(cardName, 'dueDate', e.target.value)}
                        required={false}
                      />
                      {preview && (
                        <p className="billing-cycle-preview">
                          Current period: {formatDisplayDate(preview.start)} – {formatDisplayDate(preview.end)}
                          {preview.due && (
                            <>
                              {' '}
                              · Due {formatDisplayDate(preview.due)}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="billing-cycle-hint">Uses the 1st through last day of each calendar month.</p>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <AnimatePresence>
        {editingCard && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="modal-content modal-content-wide"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <button type="button" className="modal-close" onClick={resetCardEditor} aria-label="Close">
                <X size={22} />
              </button>
              <div className="modal-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
                <h2 className="page-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                  {isAddingNew ? 'Add card' : 'Edit card'}
                </h2>
                <SaveIndicator status={isUploadingCard ? 'saving' : saveStatus} />
              </div>

              {editingCard.name?.trim().toLowerCase() !== 'cash' && (
                <>
                  <CardImageUpload
                    imageUrl={editingCard.imageUrl}
                    previewUrl={pendingPreviewUrl}
                    network={editingCard.network}
                    required={isAddingNew}
                    onFileSelect={handleCardImageSelect}
                    onClear={() => {
                      setPendingPreviewUrl(null);
                      patchEditingCard({ imageUrl: '' });
                    }}
                  />

                  <NetworkPicker
                    value={editingCard.network}
                    onChange={(network) => {
                      patchEditingCard({ network });
                      setCardError(null);
                    }}
                  />
                </>
              )}

              {editingCard.name?.trim().toLowerCase() === 'cash' && (
                <p className="card-image-hint" style={{ marginBottom: 16 }}>
                  Cash does not require a card photo or payment network.
                </p>
              )}

              <div className="form-group">
                <label className="form-label">Card name</label>
                <input
                  className="form-input"
                  value={editingCard.name}
                  onChange={(e) => patchEditingCard({ name: e.target.value })}
                  placeholder="AMEX Cobalt"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last 4 digits (for ingest)</label>
                <input
                  className="form-input"
                  value={editingCard.last4 || ''}
                  onChange={(e) =>
                    patchEditingCard({
                      last4: e.target.value.replace(/\D/g, '').slice(0, 4),
                    })
                  }
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
              {cardError && (
                <p className="inline-error" role="alert" style={{ marginBottom: 12 }}>
                  {cardError}
                </p>
              )}
              <div className="form-group">
                <label className="form-label">Reward currency</label>
                <input
                  className="form-input"
                  value={editingCard.currency}
                  onChange={(e) => patchEditingCard({ currency: e.target.value })}
                  placeholder="Points"
                />
              </div>
              <p className="form-label" style={{ marginTop: '16px' }}>Multipliers</p>
              <div className="form-grid-2" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {Object.keys(editingCard.multipliers).map((key) => (
                  <div key={key} className="form-group" style={{ marginBottom: '8px' }}>
                    <label className="form-label">{key}</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={editingCard.multipliers[key]}
                      onChange={(e) =>
                        patchEditingCard({
                          multipliers: {
                            ...editingCard.multipliers,
                            [key]: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              {!isAddingNew && (
                <div style={{ marginTop: 24 }}>
                  <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={() => deleteCard(editingCard.originalName || editingCard.name)}>
                    <Trash2 size={18} /> Delete card
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Settings = () => {
  const { config, setConfig, loading, syncError, syncStatus, refresh } = useData();
  const toast = useToast();

  const handleRetry = async () => {
    const result = await refresh();
    if (!result?.ok) toast.error('Sync failed', { description: syncError });
  };

  if (!config && loading) return <LoadingScreen label="Loading preferences" />;
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
    <>
      {syncError && (
        <SyncBanner
          message={`${syncError}. Showing cached settings.`}
          onRetry={handleRetry}
          retrying={loading}
        />
      )}
      <SettingsForm key={config} initialConfig={config} commitConfig={setConfig} />
    </>
  );
};

export default Settings;
