import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, Trash2, CreditCard, DollarSign, X } from 'lucide-react';
import { saveConfig, uploadCardImage } from '../services/storage';
import { useData } from '../hooks/useData';
import { useToast } from '../hooks/useToast';
import { inferNetworkFromName } from '../config/cardNetworks';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import PageError from '../components/ui/PageError';
import SyncBanner from '../components/ui/SyncBanner';
import CardImageUpload from '../components/settings/CardImageUpload';
import PaymentCardTile, { NetworkPicker } from '../components/settings/PaymentCardTile';
import { getPageErrorTitle, getPageErrorVariant } from '../utils/apiErrors';
import LoadingScreen from '../components/layout/LoadingScreen';
import { stagger } from '../motion/presets';

const cloneConfig = (config) => structuredClone(config);

const SettingsForm = ({ initialConfig, commitConfig }) => {
  const toast = useToast();
  const [draft, setDraft] = useState(() => cloneConfig(initialConfig));
  const [editingCard, setEditingCard] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCard, setIsUploadingCard] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);

  const persistDraft = async (nextDraft, successMessage) => {
    setIsSaving(true);
    const { ok, error } = await saveConfig(nextDraft);
    setIsSaving(false);
    if (!ok) {
      toast.error('Save failed', { description: error });
      return false;
    }
    setDraft(nextDraft);
    commitConfig(nextDraft);
    if (successMessage) toast.success(successMessage);
    return true;
  };

  const handleSave = async () => {
    await persistDraft(draft, 'Budgets saved');
  };

  const updateBudget = (category, value) =>
    setDraft((prev) => ({
      ...prev,
      BUDGET_CONFIG: { ...prev.BUDGET_CONFIG, [category]: parseFloat(value) || 0 },
    }));

  const resetCardEditor = () => {
    setEditingCard(null);
    setPendingImageFile(null);
    setPendingPreviewUrl(null);
    setCardError(null);
  };

  const openCardEditor = (name, data) => {
    const last4 = Object.entries(draft.CARD_IDENTIFIERS || {}).find(([, v]) => v === name)?.[0] || '';
    setEditingCard({
      name,
      ...data,
      network: data.network || inferNetworkFromName(name),
      last4,
    });
    setIsAddingNew(false);
    setPendingImageFile(null);
    setPendingPreviewUrl(null);
    setCardError(null);
  };

  const openNewCardEditor = () => {
    const multipliers = Object.fromEntries(draft.CATEGORIES.map((c) => [c.value, 1]));
    multipliers.Base = 1;
    setEditingCard({
      name: '',
      currency: 'Points',
      multipliers,
      network: '',
      imageUrl: '',
      last4: '',
    });
    setIsAddingNew(true);
    setPendingImageFile(null);
    setPendingPreviewUrl(null);
    setCardError(null);
  };

  const saveCardChanges = async () => {
    const name = editingCard.name.trim();
    if (!name) {
      setCardError('Card name is required');
      toast.error('Card name required');
      return;
    }
    const isCash = name.toLowerCase() === 'cash';
    if (!isCash && !editingCard.network) {
      setCardError('Select a payment network (AMEX, Mastercard, or Visa)');
      toast.error('Payment network required');
      return;
    }
    if (isAddingNew && !isCash && !editingCard.imageUrl && !pendingImageFile) {
      setCardError('Add a photo of the card');
      toast.error('Card photo required');
      return;
    }

    let imageUrl = editingCard.imageUrl || '';
    if (pendingImageFile) {
      setIsUploadingCard(true);
      const upload = await uploadCardImage(pendingImageFile);
      setIsUploadingCard(false);
      if (!upload.ok) {
        setCardError(upload.error || 'Image upload failed');
        toast.error('Image upload failed', { description: upload.error });
        return;
      }
      imageUrl = upload.imageUrl;
    }

    const nextIdentifiers = { ...(draft.CARD_IDENTIFIERS || {}) };
    Object.keys(nextIdentifiers).forEach((k) => {
      if (nextIdentifiers[k] === editingCard.name) delete nextIdentifiers[k];
    });
    if (editingCard.last4) nextIdentifiers[editingCard.last4] = name;

    const nextCards = { ...draft.CARDS };
    if (!isAddingNew && editingCard.name !== name) {
      delete nextCards[editingCard.name];
    }

    nextCards[name] = {
      currency: editingCard.currency,
      multipliers: editingCard.multipliers,
      ...(editingCard.network && { network: editingCard.network }),
      ...(imageUrl && { imageUrl }),
    };

    const nextDraft = {
      ...draft,
      CARD_IDENTIFIERS: nextIdentifiers,
      CARDS: nextCards,
      BILLING_CYCLES: {
        ...(draft.BILLING_CYCLES || {}),
        [name]: draft.BILLING_CYCLES?.[editingCard.name] || draft.BILLING_CYCLES?.[name] || { type: 'monthly' },
      },
    };

    const ok = await persistDraft(nextDraft, isAddingNew ? 'Card added' : 'Card updated');
    if (ok) resetCardEditor();
  };

  const deleteCard = async (name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    const nextCards = { ...draft.CARDS };
    delete nextCards[name];
    const nextCycles = { ...(draft.BILLING_CYCLES || {}) };
    delete nextCycles[name];
    const nextDraft = { ...draft, CARDS: nextCards, BILLING_CYCLES: nextCycles };
    const ok = await persistDraft(nextDraft, 'Card removed');
    if (ok) resetCardEditor();
  };

  return (
    <motion.div className="settings-page" variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle="Cards save automatically. Use Save for budget limits."
        action={
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={18} />
            <span className="hide-mobile">{isSaving ? 'Saving...' : 'Save budgets'}</span>
          </button>
        }
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
              <p>Custom statement periods per card (optional)</p>
            </div>
          </div>
          <div className="budget-slider-grid">
            {Object.keys(draft.CARDS).map((cardName) => {
              const cycle = draft.BILLING_CYCLES?.[cardName] || { type: 'monthly' };
              return (
                <div key={cardName} className="budget-settings-row">
                  <div className="budget-row-head">
                    <span>{cardName}</span>
                    <select
                      className="form-input"
                      style={{ width: 'auto', minWidth: '120px' }}
                      value={cycle.type || 'monthly'}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          BILLING_CYCLES: {
                            ...(prev.BILLING_CYCLES || {}),
                            [cardName]: {
                              type: e.target.value,
                              startDay: prev.BILLING_CYCLES?.[cardName]?.startDay || 1,
                            },
                          },
                        }))
                      }
                    >
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  {cycle.type === 'custom' && (
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      max="28"
                      placeholder="Start day"
                      value={cycle.startDay || 1}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          BILLING_CYCLES: {
                            ...(prev.BILLING_CYCLES || {}),
                            [cardName]: { type: 'custom', startDay: parseInt(e.target.value, 10) || 1 },
                          },
                        }))
                      }
                    />
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
              <h2 className="page-title" style={{ fontSize: '1.25rem', marginBottom: '20px' }}>
                {isAddingNew ? 'Add card' : 'Edit card'}
              </h2>

              {editingCard.name?.trim().toLowerCase() !== 'cash' && (
                <>
                  <CardImageUpload
                    imageUrl={editingCard.imageUrl}
                    previewUrl={pendingPreviewUrl}
                    network={editingCard.network}
                    required={isAddingNew}
                    onFileSelect={(file, url) => {
                      setPendingImageFile(file);
                      setPendingPreviewUrl(url);
                      setCardError(null);
                    }}
                    onClear={() => {
                      setPendingImageFile(null);
                      setPendingPreviewUrl(null);
                      setEditingCard({ ...editingCard, imageUrl: '' });
                    }}
                  />

                  <NetworkPicker
                    value={editingCard.network}
                    onChange={(network) => {
                      setEditingCard({ ...editingCard, network });
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
                  onChange={(e) => setEditingCard({ ...editingCard, name: e.target.value })}
                  placeholder="AMEX Cobalt"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last 4 digits (for ingest)</label>
                <input
                  className="form-input"
                  value={editingCard.last4 || ''}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
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
                  onChange={(e) => setEditingCard({ ...editingCard, currency: e.target.value })}
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
                        setEditingCard({
                          ...editingCard,
                          multipliers: { ...editingCard.multipliers, [key]: parseFloat(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                {!isAddingNew && (
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => deleteCard(editingCard.name)}>
                    <Trash2 size={18} /> Delete
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={saveCardChanges}
                  disabled={isUploadingCard}
                >
                  <Save size={18} /> {isUploadingCard ? 'Uploading...' : isAddingNew ? 'Add card' : 'Update card'}
                </button>
              </div>
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
