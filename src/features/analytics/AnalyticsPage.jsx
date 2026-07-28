import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ParentSize } from '@visx/responsive';
import PageHeader from '@/components/ui/PageHeader';
import SectionCard from '@/components/ui/SectionCard';
import PageError from '@/components/ui/PageError';
import SyncBanner from '@/components/ui/SyncBanner';
import LoadingScreen from '@/components/layout/LoadingScreen';
import DateRangePicker from '@/features/dashboard/components/DateRangePicker';
import ScrollSection from '@/motion/anime/ScrollSection';
import { useInViewCountUp } from '@/motion/anime/scrollReveal';
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

const KpiBlock = ({ label, value, hint, formatFn = (v) => String(v), sectionRef }) => {
  const valueRef = useRef(null);
  useInViewCountUp(sectionRef, valueRef, typeof value === 'number' ? value : 0, formatFn, [value]);

  return (
    <div className="stat-block" data-scroll-item>
      <span className="stat-label">{label}</span>
      <span className="stat-value" ref={valueRef}>
        {formatFn(typeof value === 'number' ? value : 0)}
      </span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
};

const ResponsiveChart = ({ height, children }) => (
  <ParentSize debounceTime={10}>
    {({ width }) => (width > 0 ? children(width) : <div style={{ height, width: '100%' }} aria-hidden />)}
  </ParentSize>
);

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
  const kpiSectionRef = useRef(null);
  const filters = useAnalyticsFilters(transactions, config);

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

  const filterDeps = [filters.startDate, filters.endDate, filters.selectedCard];

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
    <div className="analytics-page">
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

      <ScrollSection mount as="div" className="analytics-toolbar" deps={filterDeps}>
        <div data-scroll-item>
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
      </ScrollSection>

      <ScrollSection mount ref={kpiSectionRef} as="div" className="hero-stats analytics-kpis" deps={[summary.totalSpent]}>
        <KpiBlock
          sectionRef={kpiSectionRef}
          label="Total spent"
          value={summary.totalSpent}
          formatFn={formatCurrency}
          hint={changeLabel}
        />
        <KpiBlock
          sectionRef={kpiSectionRef}
          label="Avg / day"
          value={summary.avgPerDay}
          formatFn={formatCurrency}
          hint={`${summary.transactionCount} txns`}
        />
        <KpiBlock
          sectionRef={kpiSectionRef}
          label="Rewards"
          value={Object.values(summary.rewardTotals)[0] ?? 0}
          hint={formatRewardsSummary(summary.rewardTotals)}
          formatFn={(v) => (v ? String(Math.floor(v)) : '—')}
        />
      </ScrollSection>

      <ScrollSection mount deps={[dailySeries.length, ...filterDeps]}>
        <div data-scroll-item>
          <ChartShell title="Spending over time">
            <ResponsiveChart height={280}>
              {(width) => (
                <AreaTrendChart
                  data={dailySeries}
                  width={width}
                  height={280}
                  accentColor="var(--accent)"
                  animateIn
                />
              )}
            </ResponsiveChart>
          </ChartShell>
        </div>
      </ScrollSection>

      <div className="analytics-grid">
        <ScrollSection mount deps={[categoryData.length, ...filterDeps]}>
          <div data-scroll-item>
            <ChartShell title="By category">
              <CategoryDonut
                data={categoryData}
                categories={config.CATEGORIES}
                selectedCategory={filters.selectedCategory}
                animateIn
                onCategoryClick={(cat) =>
                  filters.setSelectedCategory(filters.selectedCategory === cat ? 'All' : cat)
                }
              />
            </ChartShell>
          </div>
        </ScrollSection>

        <ScrollSection mount deps={[merchants.length, ...filterDeps]}>
          <div data-scroll-item>
            <ChartShell title="Top merchants">
              <MerchantBars data={merchants} animateIn />
            </ChartShell>
          </div>
        </ScrollSection>
      </div>

      {cardBreakdown.length > 1 && (
        <ScrollSection deps={[cardBreakdown.length, ...filterDeps]}>
          <div data-scroll-item>
            <SectionCard title="By card">
              <div className="analytics-card-breakdown">
                {cardBreakdown.map((row) => (
                  <div key={row.name} className="analytics-card-row">
                    <span>{row.name}</span>
                    <span className="sub-amount">{formatCurrency(row.value)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </ScrollSection>
      )}

      {rewards.currencies.length > 0 && (
        <ScrollSection deps={[rewards.series.length, ...filterDeps]}>
          <div data-scroll-item>
            <ChartShell title="Rewards over time">
              <ResponsiveChart height={220}>
                {(width) => (
                  <AreaTrendChart
                    data={rewards.series.map((d) => ({
                      ...d,
                      amount: rewards.currencies.reduce((sum, c) => sum + (d[c] ?? 0), 0),
                    }))}
                    width={width}
                    height={220}
                    accentColor="var(--accent-2)"
                    animateIn
                  />
                )}
              </ResponsiveChart>
            </ChartShell>
          </div>
        </ScrollSection>
      )}

      <ScrollSection deps={[budgetRows.length, ...filterDeps]}>
        <div data-scroll-item>
          <ChartShell title="Budget vs actual">
            <BudgetCompareChart data={budgetRows} animateIn />
          </ChartShell>
        </div>
      </ScrollSection>
    </div>
  );
};

export default AnalyticsPage;
