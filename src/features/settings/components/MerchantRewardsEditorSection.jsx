import { useState } from 'react';
import { Plus, Trash2, Store } from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';

const emptyOverride = () => ({ multiplier: 1, note: '' });

const MerchantRewardsEditorSection = ({ overrides, cardNames, onPersistOverrides }) => {
  const { confirm, confirmDialog } = useConfirm();
  const merchants = Object.keys(overrides || {}).sort((a, b) => a.localeCompare(b));
  const [newMerchant, setNewMerchant] = useState('');
  const [expanded, setExpanded] = useState(() => new Set(merchants.slice(0, 1)));

  const toggleExpanded = (merchant) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(merchant)) next.delete(merchant);
      else next.add(merchant);
      return next;
    });
  };

  const patchOverrides = (next) => {
    onPersistOverrides(next);
  };

  const addMerchant = () => {
    const name = newMerchant.trim();
    if (!name || overrides?.[name]) return;
    patchOverrides({ ...(overrides || {}), [name]: {} });
    setExpanded((prev) => new Set(prev).add(name));
    setNewMerchant('');
  };

  const removeMerchant = async (merchant) => {
    const ok = await confirm({
      title: `Remove ${merchant}?`,
      message: 'All reward overrides for this merchant will be deleted.',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    const next = { ...(overrides || {}) };
    delete next[merchant];
    patchOverrides(next);
    setExpanded((prev) => {
      const copy = new Set(prev);
      copy.delete(merchant);
      return copy;
    });
  };

  const updateCardOverride = (merchant, cardName, field, value) => {
    const merchantData = { ...(overrides[merchant] || {}) };
    const current = { ...emptyOverride(), ...merchantData[cardName] };
    merchantData[cardName] = {
      ...current,
      [field]: field === 'multiplier' ? parseFloat(value) || 0 : value,
    };
    patchOverrides({ ...(overrides || {}), [merchant]: merchantData });
  };

  const addCardOverride = (merchant, cardName) => {
    if (!cardName || overrides[merchant]?.[cardName]) return;
    const merchantData = { ...(overrides[merchant] || {}), [cardName]: emptyOverride() };
    patchOverrides({ ...(overrides || {}), [merchant]: merchantData });
  };

  const removeCardOverride = (merchant, cardName) => {
    const merchantData = { ...(overrides[merchant] || {}) };
    delete merchantData[cardName];
    const next = { ...(overrides || {}) };
    if (Object.keys(merchantData).length === 0) delete next[merchant];
    else next[merchant] = merchantData;
    patchOverrides(next);
  };

  const availableCardsFor = (merchant) =>
    cardNames.filter((card) => !overrides[merchant]?.[card]);

  return (
    <div className="merchant-rewards-editor">
      {merchants.length === 0 && (
        <p className="merchant-rewards-empty">No merchant overrides yet. Add one below.</p>
      )}

      {merchants.map((merchant) => {
        const isOpen = expanded.has(merchant);
        const cardOverrides = Object.entries(overrides[merchant] || {});

        return (
          <div key={merchant} className="merchant-rewards-card">
            <button
              type="button"
              className="merchant-rewards-head"
              onClick={() => toggleExpanded(merchant)}
              aria-expanded={isOpen}
            >
              <Store size={18} />
              <span className="merchant-rewards-name">{merchant}</span>
              <span className="merchant-rewards-count">
                {cardOverrides.length} card{cardOverrides.length === 1 ? '' : 's'}
              </span>
            </button>

            {isOpen && (
              <div className="merchant-rewards-body">
                {cardOverrides.map(([cardName, data]) => (
                  <div key={cardName} className="merchant-rewards-row">
                    <span className="merchant-rewards-card-label">{cardName}</span>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input merchant-rewards-multiplier"
                      value={data.multiplier ?? 1}
                      onChange={(e) =>
                        updateCardOverride(merchant, cardName, 'multiplier', e.target.value)
                      }
                      aria-label={`Multiplier for ${merchant} on ${cardName}`}
                    />
                    <input
                      type="text"
                      className="form-input merchant-rewards-note"
                      value={data.note || ''}
                      onChange={(e) => updateCardOverride(merchant, cardName, 'note', e.target.value)}
                      placeholder="Note (optional)"
                      aria-label={`Note for ${merchant} on ${cardName}`}
                    />
                    <button
                      type="button"
                      className="btn-icon btn-icon-danger"
                      onClick={() => removeCardOverride(merchant, cardName)}
                      aria-label={`Remove ${cardName} override`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {availableCardsFor(merchant).length > 0 && (
                  <div className="merchant-rewards-add-card">
                    <select
                      className="form-input"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addCardOverride(merchant, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      aria-label={`Add card override for ${merchant}`}
                    >
                      <option value="">Add card override…</option>
                      {availableCardsFor(merchant).map((card) => (
                        <option key={card} value={card}>
                          {card}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-ghost merchant-rewards-delete"
                  onClick={() => removeMerchant(merchant)}
                >
                  <Trash2 size={16} />
                  Remove merchant
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="merchant-rewards-add">
        <input
          className="form-input"
          placeholder="Merchant name (e.g. Sobeys)"
          value={newMerchant}
          onChange={(e) => setNewMerchant(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addMerchant()}
        />
        <button type="button" className="btn btn-primary" onClick={addMerchant} disabled={!newMerchant.trim()}>
          <Plus size={18} />
          Add merchant
        </button>
      </div>
      {confirmDialog}
    </div>
  );
};

export default MerchantRewardsEditorSection;
