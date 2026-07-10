import Skeleton from '../ui/Skeleton';

export const TransactionListSkeleton = () => (
  <div className="skeleton-list">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="skeleton-row">
        <Skeleton width={40} height={40} radius={12} />
        <div className="skeleton-row-text">
          <Skeleton width="55%" height={12} />
          <Skeleton width="35%" height={10} />
        </div>
        <Skeleton width={70} height={14} />
      </div>
    ))}
  </div>
);

export const ChartSkeleton = ({ variant = 'bar' }) => (
  <div className="chart-skeleton" data-variant={variant}>
    {variant === 'pie' ? (
      <>
        <Skeleton width={150} height={150} radius="50%" />
        <div className="chart-skeleton-chips">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width={70} height={22} radius={999} />
          ))}
        </div>
      </>
    ) : (
      <div className="chart-skeleton-bars">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} width={28} height={`${30 + (i * 11) % 70}%`} radius={6} />
        ))}
      </div>
    )}
  </div>
);

export const BudgetSkeleton = () => (
  <div className="summary-cards">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="budget-row">
        <div className="budget-row-head">
          <Skeleton width={90} height={12} />
          <Skeleton width={70} height={12} />
        </div>
        <Skeleton width="100%" height={6} radius={999} />
      </div>
    ))}
  </div>
);
