import CardImageUpload from '@/features/settings/components/CardImageUpload';
import { NetworkPicker } from '@/features/settings/components/PaymentCardTile';
import DateField from '@/components/forms/DateField';
import { resolveBillingPeriod } from '@shared/billingCycle';
import { formatDisplayDate } from '@/utils/date';

const emptyAnchor = () => ({ statementStart: '', statementEnd: '', dueDate: '' });

const CardForm = ({
  step,
  card,
  isAddingNew,
  cardError,
  pendingPreviewUrl,
  onPatch,
  onImageSelect,
  onImageClear,
}) => {
  const name = card.name?.trim() || '';
  const isCash = name.toLowerCase() === 'cash';
  const cycle = card.billingCycle || { type: 'monthly' };
  const isStatement = cycle.type === 'statement';
  const anchor = cycle.anchor || emptyAnchor();

  const setBillingType = (type) => {
    if (type === 'monthly') {
      onPatch({ billingCycle: { type: 'monthly' } });
      return;
    }
    const existing = cycle.anchor ? { ...cycle.anchor } : emptyAnchor();
    onPatch({ billingCycle: { type: 'statement', anchor: existing } });
  };

  const updateAnchor = (field, value) => {
    const nextAnchor = { ...(cycle.anchor || emptyAnchor()), [field]: value };
    onPatch({ billingCycle: { type: 'statement', anchor: nextAnchor } });
  };

  const preview =
    isStatement && anchor.statementStart && anchor.statementEnd && anchor.dueDate
      ? resolveBillingPeriod(name || 'Card', new Date(), { [name || 'Card']: cycle })
      : null;

  if (step === 1) {
    if (isCash) {
      return (
        <p className="card-image-hint">
          Cash does not require a card photo or payment network. Continue to enter details.
        </p>
      );
    }

    return (
      <>
        <CardImageUpload
          imageUrl={card.imageUrl}
          previewUrl={pendingPreviewUrl}
          network={card.network}
          required={isAddingNew}
          onFileSelect={onImageSelect}
          onClear={onImageClear}
        />
        <NetworkPicker
          value={card.network}
          onChange={(network) => onPatch({ network })}
          error={cardError && !card.network ? cardError : null}
        />
        {cardError && card.network && (
          <p className="inline-error" role="alert" style={{ marginTop: 12 }}>
            {cardError}
          </p>
        )}
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <div className="form-group">
          <label className="form-label">Card name</label>
          <input
            className="form-input"
            value={card.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            placeholder="AMEX Cobalt"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Last 4 digits (for ingest)</label>
          <input
            className="form-input"
            value={card.last4 || ''}
            onChange={(e) =>
              onPatch({ last4: e.target.value.replace(/\D/g, '').slice(0, 4) })
            }
            placeholder="1234"
            maxLength={4}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Reward currency</label>
          <input
            className="form-input"
            value={card.currency}
            onChange={(e) => onPatch({ currency: e.target.value })}
            placeholder="Points"
          />
        </div>
      </>
    );
  }

  if (step === 3) {
    if (isCash) {
      return (
        <p className="billing-cycle-hint">
          Cash uses the calendar month for budgeting (1st through last day of each month).
        </p>
      );
    }

    return (
      <div className="billing-cycle-fields billing-cycle-fields-step">
        <div className="form-group">
          <label className="form-label">Billing period type</label>
          <select
            className="form-input"
            value={isStatement ? 'statement' : 'monthly'}
            onChange={(e) => setBillingType(e.target.value)}
          >
            <option value="monthly">Calendar month</option>
            <option value="statement">Statement period</option>
          </select>
        </div>

        {isStatement ? (
          <>
            <DateField
              label="Statement opens"
              name="statementStart"
              value={anchor.statementStart || ''}
              onChange={(e) => updateAnchor('statementStart', e.target.value)}
              required={false}
            />
            <DateField
              label="Statement closes"
              name="statementEnd"
              value={anchor.statementEnd || ''}
              onChange={(e) => updateAnchor('statementEnd', e.target.value)}
              required={false}
            />
            <DateField
              label="Payment due"
              name="dueDate"
              value={anchor.dueDate || ''}
              onChange={(e) => updateAnchor('dueDate', e.target.value)}
              required={false}
            />
            {preview && (
              <p className="billing-cycle-preview">
                Current period: {formatDisplayDate(preview.start)} – {formatDisplayDate(preview.end)}
                {preview.due && <> · Due {formatDisplayDate(preview.due)}</>}
              </p>
            )}
          </>
        ) : (
          <p className="billing-cycle-hint">
            Uses the 1st through last day of each calendar month.
          </p>
        )}
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="form-grid-2 card-multipliers-grid">
        {Object.keys(card.multipliers || {}).map((key) => (
          <div key={key} className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label">{key}</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={card.multipliers[key]}
              onChange={(e) =>
                onPatch({
                  multipliers: {
                    ...card.multipliers,
                    [key]: parseFloat(e.target.value) || 0,
                  },
                })
              }
            />
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default CardForm;
