/** Flat stat block — no card chrome. */
const StatCard = ({ label, value, hint, featured = false, children, scrollItem = false }) => (
  <div
    className={`stat-block ${featured ? 'stat-block-featured' : ''}`}
    {...(scrollItem ? { 'data-scroll-item': true } : {})}
  >
    <span className="stat-label">{label}</span>
    <span className={`stat-value ${featured ? 'stat-value-hero' : ''}`}>
      {children ?? value}
    </span>
    {hint && <span className="stat-hint">{hint}</span>}
  </div>
);

export default StatCard;
