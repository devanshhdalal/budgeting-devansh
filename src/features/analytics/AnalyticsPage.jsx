import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ParentSize } from '@visx/responsive';
import PageHeader from '@/components/ui/PageHeader';
import SectionCard from '@/components/ui/SectionCard';
import PageError from '@/components/ui/PageError';
import SyncBanner from '@/components/ui/SyncBanner';
import LoadingScreen from '@/components/layout/LoadingScreen';
import DateRangePicker from '@/features/dashboard/components/DateRangePicker';
import { useData } from '@/hooks/useData';
import { useToast } from '@/hooks/useToast';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { formatDisplayDate } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { getPageErrorTitle, getPageErrorVariant } from '@/utils/apiErrors';
import {
  buildDailySeries,
  buildCategoryBreakdown,
  buildMerchantRankings,
  buildCardBreakdown,
  buildRewardsSeries,
  buildBudgetVsActual,
  buildAnalyticsSummary,
} from '@/utils/analytics';
import {
  ChartShell,
  AreaTrendChart,
  CategoryDonut,
  MerchantBars,
  BudgetCompareChart,
} from '@/components/charts';
import { useScrollReveal } from '@/motion/anime/scrollReveal';
import { useCountUp } from '@/motion/anime/countUp';

const KpiBlock = ({ label, value, hint, formatFn = (v) => String(v) }) => {
  const displayRef = useCountUp(typeof value === 'number' ? value : 0, { format: formatFn });
  return (
    <div className="stat-block scroll-reveal-item">
      <span className="stat-label">{label}</span>
      <span className="stat-value" ref={displayRef}>
        {formatFn(typeof value === 'number' ? value : 0)}
      </span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
};

const formatRewardsSummary = (totals) => {
  const entries = Object.entries(totals || {});
  if (!entries.length) return '—';
  return entries
    .map(([currency, val]) => {
      if (currency === 'Cashback') return `$${val.toFixed(2)}`;
      return `${Math.floor(val)} ${currency}`;
    })
    .join(' · ');
};

const AnalyticsPage = () => {
  const { config, transactions, loading, syncError, syncStatus, refresh } = useData();
  const toast = useToast();
  const pageRef = useRef(null);
  const filters = useAnalyticsFilters(transactions, config);

  useScrollReveal(pageRef, '.scroll-reveal-item', [
    filters.startDate,
    filters.endDate,
    filters.selectedCard,
  ]);

  const range = useMemo(
    () => ({ start: filters.startDate, end: filters.endDate }),
    [filters.startDate, filters.endDate]
  );

  const summary = useMemo(
    () => buildAnalyticsSummary(filters.filteredTransactions, config, range),
    [filters.filteredTransactions, config, range]
  );

  const dailySeries = useMemo(
    () => buildDailySeries(filters.filteredTransactions, range),
    [filters.filteredTransactions, range]
  );

  const categoryData = useMemo(
    () => buildCategoryBreakdown(filters.filteredTransactions),
    [filters.filteredTransactions]
  );

  const merchants = useMemo(
    () => buildMerchantRankings(filters.filteredTransactions),
    [filters.filteredTransactions]
  );

  const cardBreakdown = useMemo(
    () => buildCardBreakdown(filters.filteredTransactions),
    [filters.filteredTransactions]
  );

  const rewards = useMemo(
    () => buildRewardsSeries(filters.filteredTransactions, config, range),
    [filters.filteredTransactions, config, range]
  );

  const budgetRows = useMemo(
    () => buildBudgetVsActual(transactions, config, range),
    [transactions, config, range]
  );

  const periodLabel = useMemo(() => {
    if (range.start && range.end) {
      return `${formatDisplayDate(range.start)} – ${formatDisplayDate(range.end)}`;
    }
    return 'All time';
  }, [range]);

  const changeLabel = useMemo(() => {
    if (summary.changePercent === null) return 'No prior period';
    const sign = summary.changePercent >= 0 ? '+' : '';
    return `${sign}${summary.changePercent.toFixed(0)}% vs prior period`;
  }, [summary.changePercent]);

  const handleRetry = async () => {
    const result = await refresh();
    if (!result?.ok) toast.error('Sync failed', { description: syncError });
  };

  if (!config && loading) return <LoadingScreen label="Loading analytics" />;
  if (!config) {
    return (
      <PageError
        variant={getPageErrorVariant(syncStatus)}
        title={getPageErrorTitle(syncStatus)}
        description={syncError ?? 'No configuration found for this profile.'}
        onRetry={handleRetry}
        retrying={loading}
      />
    );
  }

  return (
    <div ref={pageRef} className="analytics-page">
      <PageHeader
        eyebrow="Spending"
        title="Analytics"
        subtitle={`${periodLabel} · ${summary.transactionCount} transactions`}
        action={
          <Link to="/" className="btn btn-secondary">
            Back to Overview
          </Link>
        }
      />

      {syncError && (
        <SyncBanner message={`${syncError}. Showing cached data.`} onRetry={handleRetry} retrying={loading} />
      )}

      <div className="analytics-toolbar scroll-reveal-item">
        <DateRangePicker
          startDate={filters.startDate}
          endDate={filters.endDate}
          setStartDate={filters.setStartDate}
          setEndDate={filters.setEndDate}
        />
        <div className="quick-actions">
          <button type="button" className="chip" onClick={filters.setThisMonth}>
            This month
          </button>
        </div>
        <select
          className="form-input category-select"
          value={filters.selectedCard}
          onChange={(e) => filters.setSelectedCard(e.target.value)}
        >
          {filters.uniqueCards.map((card) => (
            <option key={card} value={card}>{card}</option>
          ))}
        </select>
      </div>

      <div className="hero-stats analytics-kpis">
        <KpiBlock label="Total spent" value={summary.totalSpent} formatFn={formatCurrency} hint={changeLabel} />
        <KpiBlock label="Avg / day" value={summary.avgPerDay} formatFn={formatCurrency} hint={`${summary.transactionCount} txns`} />
        <KpiBlock
          label="Rewards"
          value={Object.values(summary.rewardTotals)[0] ?? 0}
          hint={formatRewardsSummary(summary.rewardTotals)}
          formatFn={(v) => (v ? String(Math.floor(v)) : '—')}
        />
      </div>

      <ChartShell title="Spending over time" className="scroll-reveal-item">
        <ParentSize debounceTime={10}>
          {({ width }) => (
            <AreaTrendChart data={dailySeries} width={Math.max(width, 320)} height={280} accentColor="var(--accent)" />
          )}
        </ParentSize>
      </ChartShell>

      <div className="analytics-grid">
        <ChartShell title="By category" className="scroll-reveal-item">
          <CategoryDonut
            data={categoryData}
            categories={config.CATEGORIES}
            selectedCategory={filters.selectedCategory}
            onCategoryClick={(cat) =>
              filters.setSelectedCategory(filters.selectedCategory === cat ? 'All' : cat)
            }
          />
        </ChartShell>

        <ChartShell title="Top merchants" className="scroll-reveal-item">
          <MerchantBars data={merchants} />
        </ChartShell>
      </div>

      {cardBreakdown.length > 1 && (
        <SectionCard title="By card" className="scroll-reveal-item">
          <div className="analytics-card-breakdown">
            {cardBreakdown.map((row) => (
              <div key={row.name} className="analytics-card-row">
                <span>{row.name}</span>
                <span className="sub-amount">{formatCurrency(row.value)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {rewards.currencies.length > 0 && (
        <ChartShell title="Rewards over time" className="scroll-reveal-item">
          <ParentSize debounceTime={10}>
            {({ width }) => (
              <AreaTrendChart
                data={rewards.series.map((d) => ({
                  ...d,
                  amount: rewards.currencies.reduce((sum, c) => sum + (d[c] ?? 0), 0),
                }))}
                width={Math.max(width, 320)}
                height={220}
                accentColor="var(--accent-2)"
              />
            )}
          </ParentSize>
        </ChartShell>
      )}

      <ChartShell title="Budget vs actual" className="scroll-reveal-item">
        <BudgetCompareChart data={budgetRows} />
      </ChartShell>
    </div>
  );
};

export default AnalyticsPage;
