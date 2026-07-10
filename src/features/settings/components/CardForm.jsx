import CardImageUpload from '@/features/settings/components/CardImageUpload';
import { NetworkPicker } from '@/features/settings/components/PaymentCardTile';
import DateField from '@/components/forms/DateField';
import ElasticSlider from '@/components/ui/ElasticSlider';
import { describeBillingRule, resolveBillingPeriod } from '@shared/billingCycle';
import { formatDisplayDate } from '@/utils/date';

const formatMultiplier = (value) => {
  const v = Number(value) || 0;
  if (v > 0 && v < 1) return `${Math.round(v * 100)}%`;
  return `${Number.isInteger(v) ? v : v.toFixed(2)}x`;
};

const emptyAnchor = () => ({ statementStart: '', statementEnd: '', dueDate: '' });

const formatPeriodLine = (start, end, due) => (
  <>
    {formatDisplayDate(start)} – {formatDisplayDate(end)}
    {due && <> · Due {formatDisplayDate(due)}</>}
  </>
);

const BillingCyclePreview = ({ anchor, cycle, cardKey }) => {
  const hasFullAnchor = anchor.statementStart && anchor.statementEnd && anchor.dueDate;
  if (!hasFullAnchor) return null;

  const activePreview = resolveBillingPeriod(cardKey, new Date(), { [cardKey]: cycle });
  const rule = describeBillingRule(anchor);

  return (
    <div className="billing-cycle-preview-grid">
      <div className="billing-cycle-preview-row">
        <span className="billing-cycle-preview-label">Your example</span>
        <span className="billing-cycle-preview-value">
          {formatPeriodLine(anchor.statementStart, anchor.statementEnd, anchor.dueDate)}
        </span>
      </div>
      <div className="billing-cycle-preview-row">
        <span className="billing-cycle-preview-label">Active today</span>
        <span className="billing-cycle-preview-value">
          {formatPeriodLine(activePreview.start, activePreview.end, activePreview.due)}
        </span>
      </div>
      {rule && (
        <div className="billing-cycle-preview-row">
          <span className="billing-cycle-preview-label">Rule</span>
          <span className="billing-cycle-preview-value billing-cycle-preview-rule">{rule.label}</span>
        </div>
      )}
    </div>
  );
};

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

  const cardKey = name || 'Card';

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
            <p className="billing-cycle-hint billing-cycle-anchor-hint">
              Enter one recent statement exactly as it appears on your card. We&apos;ll repeat the
              close day and payment grace period automatically.
            </p>
            <DateField
              label="Example: statement opens"
              name="statementStart"
              value={anchor.statementStart || ''}
              onChange={(e) => updateAnchor('statementStart', e.target.value)}
              required={false}
            />
            <DateField
              label="Example: statement closes"
              name="statementEnd"
              value={anchor.statementEnd || ''}
              onChange={(e) => updateAnchor('statementEnd', e.target.value)}
              required={false}
            />
            <DateField
              label="Example: payment due"
              name="dueDate"
              value={anchor.dueDate || ''}
              onChange={(e) => updateAnchor('dueDate', e.target.value)}
              required={false}
            />
            <BillingCyclePreview anchor={anchor} cycle={cycle} cardKey={cardKey} />
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
          <div key={key} className="form-group card-multiplier-row" style={{ marginBottom: 8 }}>
            <label className="form-label">{key}</label>
            <ElasticSlider
              value={card.multipliers[key] ?? 0}
              onChange={(v) =>
                onPatch({
                  multipliers: {
                    ...card.multipliers,
                    [key]: v,
                  },
                })
              }
              startingValue={0}
              maxValue={10}
              isStepped
              stepSize={0.01}
              fullWidth
              formatValue={formatMultiplier}
              ariaLabel={`${key} reward multiplier`}
            />
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default CardForm;
