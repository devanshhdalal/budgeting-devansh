import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, CreditCard, DollarSign, Tag, Store, Minus } from 'lucide-react';
import { saveConfig, uploadCardImage } from '@/services/storage';
import { useData } from '@/hooks/useData';
import { useToast } from '@/hooks/useToast';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useConfirm } from '@/hooks/useConfirm';
import { inferNetworkFromName } from '@/config/cardNetworks';
import PageHeader from '@/components/ui/PageHeader';
import SectionCard from '@/components/ui/SectionCard';
import ElasticSlider from '@/components/ui/ElasticSlider';
import PageError from '@/components/ui/PageError';
import SyncBanner from '@/components/ui/SyncBanner';
import SaveIndicator from '@/components/ui/SaveIndicator';
import PaymentCardTile from '@/features/settings/components/PaymentCardTile';
import CardEditorFlow from '@/features/settings/components/CardEditorFlow';
import CategoriesEditorSection from '@/features/settings/components/CategoriesEditorSection';
import MerchantRewardsEditorSection from '@/features/settings/components/MerchantRewardsEditorSection';
import { getPageErrorTitle, getPageErrorVariant } from '@/utils/apiErrors';
import LoadingScreen from '@/components/layout/LoadingScreen';
import { stagger } from '@/motion/presets';

const cloneConfig = (config) => structuredClone(config);

const SettingsForm = ({ initialConfig, commitConfig, transactions, setTransactions }) => {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
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
      draftRef.current = nextDraft;
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
    draftRef.current = nextDraft;
    debouncedPersist(nextDraft);
  };

  const patchConfig = useCallback(
    async (partial, successMessage) => {
      const nextDraft = { ...draftRef.current, ...partial };
      setDraft(nextDraft);
      draftRef.current = nextDraft;
      if (successMessage !== undefined) {
        return persistDraft(nextDraft, successMessage || null);
      }
      debouncedPersist(nextDraft);
      return true;
    },
    [debouncedPersist, persistDraft]
  );

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

    const nextCycles = { ...(baseDraft.BILLING_CYCLES || {}) };
    if (!addingNew && card.originalName && card.originalName !== name) {
      delete nextCycles[card.originalName];
    }
    nextCycles[name] = card.billingCycle || nextCycles[name] || { type: 'monthly' };

    return {
      ...baseDraft,
      CARD_IDENTIFIERS: nextIdentifiers,
      CARDS: nextCards,
      BILLING_CYCLES: nextCycles,
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
    const last4 = Object.entries(draftRef.current.CARD_IDENTIFIERS || {}).find(([, v]) => v === name)?.[0] || '';
    setEditingCard({
      name,
      originalName: name,
      ...data,
      network: data.network || inferNetworkFromName(name),
      last4,
      billingCycle: draftRef.current.BILLING_CYCLES?.[name] || { type: 'monthly' },
    });
    setIsAddingNew(false);
    setPendingPreviewUrl(null);
    setCardError(null);
  };

  const openNewCardEditor = () => {
    const multipliers = Object.fromEntries(draftRef.current.CATEGORIES.map((c) => [c.value, 1]));
    multipliers.Base = 1;
    setEditingCard({
      name: '',
      originalName: '',
      currency: 'Points',
      multipliers,
      network: '',
      imageUrl: '',
      last4: '',
      billingCycle: { type: 'monthly' },
    });
    setIsAddingNew(true);
    setPendingPreviewUrl(null);
    setCardError(null);
  };

  const deleteCard = async (name) => {
    const ok = await confirm({
      title: `Delete ${name}?`,
      message: 'This card will be removed from your payment methods. Transactions already logged on this card are not changed.',
      confirmLabel: 'Delete card',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    const base = draftRef.current;
    const nextCards = { ...base.CARDS };
    delete nextCards[name];
    const nextCycles = { ...(base.BILLING_CYCLES || {}) };
    delete nextCycles[name];
    const nextDraft = { ...base, CARDS: nextCards, BILLING_CYCLES: nextCycles };
    const saved = await persistDraft(nextDraft, 'Card removed');
    if (saved) resetCardEditor();
  };

  if (editingCard) {
    return (
      <>
        <CardEditorFlow
        card={editingCard}
        isAddingNew={isAddingNew}
        saveStatus={saveStatus}
        isUploadingCard={isUploadingCard}
        cardError={cardError}
        pendingPreviewUrl={pendingPreviewUrl}
        onBack={resetCardEditor}
        onPatch={(patch) => {
          patchEditingCard(patch);
          setCardError(null);
        }}
        onImageSelect={handleCardImageSelect}
        onImageClear={() => {
          setPendingPreviewUrl(null);
          patchEditingCard({ imageUrl: '' });
        }}
        onDelete={() => deleteCard(editingCard.originalName || editingCard.name)}
        onFlushPersist={flushCardPersist}
        onDone={resetCardEditor}
        />
        {confirmDialog}
      </>
    );
  }

  return (
    <>
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
                <ElasticSlider
                  value={draft.BUDGET_CONFIG[cat.value] || 0}
                  onChange={(v) => updateBudget(cat.value, v)}
                  startingValue={0}
                  maxValue={3000}
                  isStepped
                  stepSize={50}
                  fullWidth
                  hideValueIndicator
                  ariaLabel={`${cat.label} monthly budget`}
                  leftIcon={<Minus size={16} className="elastic-slider-icon" />}
                  rightIcon={<Plus size={16} className="elastic-slider-icon" />}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="settings-section-head">
            <div className="settings-section-icon settings-section-icon-muted">
              <Tag size={20} />
            </div>
            <div>
              <h2>Categories</h2>
              <p>Add, reorder, or remove spending categories</p>
            </div>
          </div>
          <CategoriesEditorSection
            categories={draft.CATEGORIES}
            budgetConfig={draft.BUDGET_CONFIG}
            cards={draft.CARDS}
            transactions={transactions}
            setTransactions={setTransactions}
            onPersistConfig={patchConfig}
            setSaveStatus={setSaveStatus}
          />
        </SectionCard>

        <SectionCard>
          <div className="settings-section-head">
            <div className="settings-section-icon settings-section-icon-muted">
              <Store size={20} />
            </div>
            <div>
              <h2>Merchant rewards</h2>
              <p>Per-merchant multiplier overrides by card</p>
            </div>
          </div>
          <MerchantRewardsEditorSection
            overrides={draft.MERCHANT_REWARDS_OVERRIDES || {}}
            cardNames={Object.keys(draft.CARDS)}
            onPersistOverrides={(overrides) =>
              patchConfig({ MERCHANT_REWARDS_OVERRIDES: overrides })
            }
          />
        </SectionCard>

        <SectionCard>
          <div className="settings-section-head">
            <div className="settings-section-icon settings-section-icon-muted">
              <CreditCard size={20} />
            </div>
            <div>
              <h2>Payment methods</h2>
              <p>Add cards with a photo, billing cycle, and payment network</p>
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
      </div>
    </motion.div>
    {confirmDialog}
    </>
  );
};

const Settings = () => {
  const { config, setConfig, transactions, setTransactions, loading, syncError, syncStatus, refresh } = useData();
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
      <SettingsForm
        key={config}
        initialConfig={config}
        commitConfig={setConfig}
        transactions={transactions}
        setTransactions={setTransactions}
      />
    </>
  );
};

export default Settings;
