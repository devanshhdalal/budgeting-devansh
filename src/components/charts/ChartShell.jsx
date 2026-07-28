const ChartEmpty = ({ message = 'No data in this period' }) => (
  <div className="chart-empty">
    <div className="chart-empty-ring" aria-hidden />
    <p>{message}</p>
  </div>
);

export const ChartShell = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`page-section chart-shell ${className}`.trim()}>
    {(title || action) && (
      <div className="page-section-head">
        <div>
          {title && <h2 className="page-section-title">{title}</h2>}
          {subtitle && <p className="chart-shell-subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="chart-shell-body">{children}</div>
  </section>
);

export { ChartEmpty };
export default ChartShell;
