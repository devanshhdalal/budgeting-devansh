import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, Trash2, CreditCard, DollarSign, X } from 'lucide-react';
import { saveConfig } from '../services/storage';
import { useData } from '../hooks/useData';
import { useToast } from '../hooks/useToast';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import PageError from '../components/ui/PageError';
import LoadingScreen from '../components/layout/LoadingScreen';
import { stagger } from '../motion/presets';

const cloneConfig = (config) => structuredClone(config);

/**
 * Settings keeps its own working copy so sliders feel snappy, then commits to the
 * shared data context and the server on Save. This avoids other pages seeing
 * un-saved budget changes flicker through.
 */
const SettingsForm = ({ initialConfig, commitConfig }) => {
  const toast = useToast();
  const [draft, setDraft] = useState(() => cloneConfig(initialConfig));
  const [editingCard, setEditingCard] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const { ok, error } = await saveConfig(draft);
    setIsSaving(false);
    if (ok) {
      commitConfig(draft);
      toast.success('Settings saved');
    } else {
      toast.error('Save failed', { description: error });
    }
  };

  const updateBudget = (category, value) =>
    setDraft((prev) => ({
      ...prev,
      BUDGET_CONFIG: { ...prev.BUDGET_CONFIG, [category]: parseFloat(value) || 0 },
    }));

  const openCardEditor = (name, data) => {
    setEditingCard({ name, ...data });
    setIsAddingNew(false);
  };

  const openNewCardEditor = () => {
    const multipliers = Object.fromEntries(draft.CATEGORIES.map((c) => [c.value, 1]));
    multipliers.Base = 1;
    setEditingCard({ name: '', currency: 'Points', multipliers });
    setIsAddingNew(true);
  };

  const saveCardChanges = () => {
    if (isAddingNew && !editingCard.name) return alert('Card name is required');
    setDraft((prev) => ({
      ...prev,
      CARDS: {
        ...prev.CARDS,
        [editingCard.name]: {
          currency: editingCard.currency,
          multipliers: editingCard.multipliers,
        },
      },
    }));
    setEditingCard(null);
  };

  const deleteCard = (name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    setDraft((prev) => {
      const nextCards = { ...prev.CARDS };
      delete nextCards[name];
      return { ...prev, CARDS: nextCards };
    });
    setEditingCard(null);
  };

  return (
    <motion.div className="settings-page" variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle="Budget limits, cards, and reward multipliers for this profile."
        action={
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={18} />
            <span className="hide-mobile">{isSaving ? 'Saving...' : 'Save'}</span>
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
              <p>Cards and reward multipliers</p>
            </div>
          </div>
          <div className="card-grid">
            {Object.entries(draft.CARDS).map(([name, data]) => (
              <div key={name} className="payment-card" onClick={() => openCardEditor(name, data)} role="button" tabIndex={0}>
                <div className="payment-card-accent" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="payment-card-name">{name}</div>
                    <div className="payment-card-currency">{data.currency}</div>
                  </div>
                  <span className="badge-active">Active</span>
                </div>
              </div>
            ))}
            <button type="button" className="add-card-btn" onClick={openNewCardEditor}>
              <Plus size={20} />
              Add account
            </button>
          </div>
        </SectionCard>
      </div>

      <AnimatePresence>
        {editingCard && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
              <button type="button" className="modal-close" onClick={() => setEditingCard(null)} aria-label="Close">
                <X size={22} />
              </button>
              <h2 className="page-title" style={{ fontSize: '1.25rem', marginBottom: '20px' }}>
                {isAddingNew ? 'Add card' : 'Edit card'}
              </h2>
              <div className="form-group">
                <label className="form-label">Card name</label>
                <input className="form-input" value={editingCard.name} onChange={(e) => setEditingCard({ ...editingCard, name: e.target.value })} placeholder="AMEX Cobalt" />
              </div>
              <div className="form-group">
                <label className="form-label">Reward currency</label>
                <input className="form-input" value={editingCard.currency} onChange={(e) => setEditingCard({ ...editingCard, currency: e.target.value })} placeholder="Points" />
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
                <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={saveCardChanges}>
                  <Save size={18} /> {isAddingNew ? 'Add' : 'Update'}
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
  const { config, setConfig, loading, syncError, refresh } = useData();

  if (!config && loading) return <LoadingScreen label="Loading preferences" />;
  if (!config) {
    return (
      <PageError
        variant="network"
        title="Could not load preferences"
        description={syncError ?? 'No configuration found for this profile.'}
        onRetry={refresh}
        retrying={loading}
      />
    );
  }

  return <SettingsForm key={config} initialConfig={config} commitConfig={setConfig} />;
};

export default Settings;
