import CardImage from '@/components/ui/CardImage';
import { CARD_NETWORKS, getCardNetwork, getNetworkLabel } from '@/config/cardNetworks';

const NETWORK_CLASS = {
  amex: 'network-amex',
  mastercard: 'network-mastercard',
  visa: 'network-visa',
};

export const NetworkBadge = ({ network, className = '' }) => {
  if (!network) return null;
  return (
    <span className={`network-badge ${NETWORK_CLASS[network] || ''} ${className}`.trim()}>
      {getNetworkLabel(network)}
    </span>
  );
};

const PaymentCardTile = ({ name, data, onClick }) => {
  const network = getCardNetwork(data, name);
  const networkClass = NETWORK_CLASS[network] || '';

  return (
    <div
      className={`payment-card ${networkClass}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${name} card`}
    >
      <div className="payment-card-visual">
        <CardImage src={data.imageUrl} network={network} alt={name} size="md" />
      </div>
      <div className="payment-card-body">
        <div className="payment-card-top">
          <NetworkBadge network={network} />
        </div>
        <div className="payment-card-name">{name}</div>
        <div className="payment-card-currency">{data.currency}</div>
      </div>
    </div>
  );
};

export const NetworkPicker = ({ value, onChange, error }) => (
  <div className="form-group">
    <label className="form-label">
      Payment network <span className="form-label-required">*</span>
    </label>
    <div className="network-picker" role="radiogroup" aria-label="Payment network">
      {CARD_NETWORKS.map((net) => (
        <button
          key={net.id}
          type="button"
          role="radio"
          aria-checked={value === net.id}
          className={`network-picker-btn ${NETWORK_CLASS[net.id]} ${value === net.id ? 'selected' : ''}`}
          onClick={() => onChange(net.id)}
        >
          {net.label}
        </button>
      ))}
    </div>
    {error && <p className="inline-error" role="alert">{error}</p>}
  </div>
);

export default PaymentCardTile;
