import CardImage from '@/components/ui/CardImage';
import { NetworkBadge } from '@/features/settings/components/PaymentCardTile';
import { getCardNetwork, getNetworkLabel } from '@/config/cardNetworks';
import { resolveBillingPeriod } from '@shared/billingCycle';
import { formatDisplayDate } from '@/utils/date';

const CardReview = ({ card }) => {
  const name = card.name?.trim() || '—';
  const isCash = name.toLowerCase() === 'cash';
  const network = getCardNetwork(card, name);
  const cycle = card.billingCycle || { type: 'monthly' };
  const isStatement = cycle.type === 'statement';
  const anchor = cycle.anchor || {};
  const hasFullAnchor = anchor.statementStart && anchor.statementEnd && anchor.dueDate;
  const preview =
    isStatement && hasFullAnchor
      ? resolveBillingPeriod(name, new Date(), { [name]: cycle })
      : null;

  const topMultipliers = Object.entries(card.multipliers || {})
    .filter(([, v]) => v !== 0 && v !== 1)
    .slice(0, 4);

  return (
    <div className="review-grid">
      {!isCash && (
        <div className="review-row review-row-card-visual">
          <span className="review-label">Card</span>
          <CardImage src={card.imageUrl} network={network} alt={name} size="sm" />
        </div>
      )}
      <div className="review-row">
        <span className="review-label">Name</span>
        <span className="review-value">{name}</span>
      </div>
      {!isCash && network && (
        <div className="review-row">
          <span className="review-label">Network</span>
          <span className="review-value">
            <NetworkBadge network={network} />
            {getNetworkLabel(network)}
          </span>
        </div>
      )}
      {card.last4 && (
        <div className="review-row">
          <span className="review-label">Last 4</span>
          <span className="review-value">{card.last4}</span>
        </div>
      )}
      <div className="review-row">
        <span className="review-label">Currency</span>
        <span className="review-value">{card.currency || '—'}</span>
      </div>
      <div className="review-row">
        <span className="review-label">Billing</span>
        <span className="review-value">
          {isStatement && hasFullAnchor && preview ? (
            <>
              Statement · {formatDisplayDate(preview.start)} – {formatDisplayDate(preview.end)}
              {preview.due && <> · Due {formatDisplayDate(preview.due)}</>}
            </>
          ) : (
            'Calendar month'
          )}
        </span>
      </div>
      {topMultipliers.length > 0 && (
        <div className="review-row">
          <span className="review-label">Rewards</span>
          <span className="review-value">
            {topMultipliers.map(([k, v]) => `${k}: ${v}x`).join(' · ')}
          </span>
        </div>
      )}
    </div>
  );
};

export default CardReview;
