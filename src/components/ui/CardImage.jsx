import { CARD_IMAGE_HEIGHT, CARD_IMAGE_WIDTH } from '../../config/cardImage';
import { getNetworkLabel } from '../../config/cardNetworks';

const NETWORK_CLASS = {
  amex: 'network-amex',
  mastercard: 'network-mastercard',
  visa: 'network-visa',
};

/**
 * Renders a card image at the standard 200×126 aspect ratio.
 * @param {'md' | 'sm' | 'xs'} size — md=200px, sm=120px, xs=96px wide
 */
const CardImage = ({ src, network, alt = '', size = 'md', className = '' }) => {
  const networkClass = network ? NETWORK_CLASS[network] || '' : '';

  if (src) {
    return (
      <div className={`card-media card-media-${size} ${className}`.trim()}>
        <img
          src={src}
          alt={alt}
          width={CARD_IMAGE_WIDTH}
          height={CARD_IMAGE_HEIGHT}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div
      className={`card-media card-media-${size} card-media-placeholder ${networkClass} ${className}`.trim()}
      aria-hidden={!alt}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
    >
      {network && <span className="card-media-network-label">{getNetworkLabel(network)}</span>}
    </div>
  );
};

export default CardImage;
