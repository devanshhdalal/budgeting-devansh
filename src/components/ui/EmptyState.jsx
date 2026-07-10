const EmptyState = ({ image, imageAlt = '', title, children, className = '' }) => (
  <div className={`empty-state ${className}`.trim()}>
    {image && (
      <img src={image} alt={imageAlt} className="empty-state-illustration" loading="lazy" />
    )}
    {title && <p className="empty-state-title">{title}</p>}
    {children && <div className="empty-state-body">{children}</div>}
  </div>
);

export default EmptyState;
