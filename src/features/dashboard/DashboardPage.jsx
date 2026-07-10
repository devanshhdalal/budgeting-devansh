import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { saveTransaction, deleteTransaction, uploadReceipt } from '@/services/storage';
import { SpendingPieChart, SpendingBarChart } from '@/components/charts/Charts';
import { useChartColors } from '@/hooks/useChartColors';
import { getCategoryColor } from '@/utils/chartTheme';
import TransactionItem from '@/features/transactions/components/TransactionItem';
import { CategoryIcon } from '@/utils/categoryIcons';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import SectionCard from '@/components/ui/SectionCard';
import SyncBanner from '@/components/ui/SyncBanner';
import DateRangePicker from '@/features/dashboard/components/DateRangePicker';
import EditTransactionModal from '@/features/dashboard/components/EditTransactionModal';
import ReceiptLightbox from '@/features/dashboard/components/ReceiptLightbox';
import { BudgetSkeleton, ChartSkeleton, TransactionListSkeleton } from '@/features/dashboard/components/DashboardSkeletons';
import { todayIsoDate } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { matchesDateRange } from '@/utils/filters';
import { buildPieData, buildBarData, buildInsights } from '@/utils/chartData';
import { useData } from '@/hooks/useData';
import { useToast } from '@/hooks/useToast';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import { MAX_VISIBLE_TRANSACTIONS } from '@/constants';
import { stagger, fadeUp } from '@/motion/presets';
import LoadingScreen from '@/components/layout/LoadingScreen';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import PageError from '@/components/ui/PageError';
import EmptyState from '@/components/ui/EmptyState';
import { ILLUSTRATIONS } from '@/config/illustrations';
import { resolveBillingRange, resolveBillingPeriod, resolvePreviousBillingPeriod } from '@shared/billingCycle';
import { formatDisplayDate } from '@/utils/date';
import { getPageErrorTitle, getPageErrorVariant } from '@/utils/apiErrors';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useConfirm } from '@/hooks/useConfirm';
import {
  formatRenewalLabel,
  getSubscriptions,
  renewalUrgency,
  sortByRenewal,
  subscriptionMonthlyTotal,
} from '@/utils/subscriptions';

const EMPTY_EDIT_FORM = (tx) => ({
  id: tx.id,
  Merchant: tx.Merchant || '',
  Amount: tx.Amount || 0,
  Date: tx.Date || todayIsoDate(),
  Category: tx.Category || 'Other',
  Card: tx.Card || '',
  Notes: tx.Notes || '',
  ReceiptUrl: tx.ReceiptUrl || '',
});

const budgetColorOpacity = (percentage) => {
  if (percentage > 90) return 1;
  if (percentage > 70) return 0.88;
  return 0.72;
};

const formatRewards = (totals) => {
  const entries = Object.entries(totals);
  if (!entries.length) return 'No rewards yet';
  return entries
    .map(([currency, value]) => {
      if (currency === 'Cashback') return `+$${value.toFixed(2)}`;
      return `+${Math.floor(value)} ${currency}`;
    })
    .join(' · ');
};

const useCategoryBudgets = (transactions, appConfig, startDate, endDate) =>
  useMemo(() => {
    if (!appConfig) return [];
    const limits = appConfig.BUDGET_CONFIG || {};

    const spentByCategory = new Map();
    for (const t of transactions) {
      if (!matchesDateRange(t.Date, startDate, endDate)) continue;
      const cat = t.Category;
      spentByCategory.set(cat, (spentByCategory.get(cat) ?? 0) + (t.Amount || 0));
    }

    return appConfig.CATEGORIES.map((cat) => {
      const spent = spentByCategory.get(cat.value) ?? 0;
      const limit = limits[cat.value] || 0;
      const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
      return { ...cat, spent, limit, percentage };
    });
  }, [transactions, appConfig, startDate, endDate]);

const SubscriptionsCard = ({ subscriptions, categories }) => {
  const monthlyBurnRate = subscriptionMonthlyTotal(subscriptions);
  const sorted = sortByRenewal(subscriptions).slice(0, 5);

  return (
    <SectionCard
      title="Subscriptions"
      className="col-span-4"
      action={
        <Link to="/subscriptions" className="page-section-link">
          Manage · {formatCurrency(monthlyBurnRate)}/mo
        </Link>
      }
    >
      <div className="sub-list">
        {sorted.length === 0 && (
          <p className="empty-state">
            No subscriptions tracked.{' '}
            <Link to="/subscriptions" className="inline-link">Add one</Link>
          </p>
        )}
        {sorted.map((sub) => {
          const urgency = renewalUrgency(sub.renewalDate);
          return (
            <div key={sub.id} className="sub-row">
              <div className="sub-row-left">
                <div className="sub-icon">
                  <CategoryIcon category="Subscriptions" categories={categories} />
                </div>
                <div>
                  <div className="sub-name">{sub.name}</div>
                  <div className="sub-renewal-meta">
                    <span className={`sub-renewal-badge sub-renewal-${urgency}`}>
                      {formatRenewalLabel(sub.renewalDate)}
                    </span>
                  </div>
                </div>
              </div>
              <span className="sub-amount">{formatCurrency(sub.amount)}</span>
            </div>
          );
        })}
        {subscriptions.length > 5 && (
          <Link to="/subscriptions" className="inline-link" style={{ textAlign: 'center', marginTop: 4 }}>
            View all {subscriptions.length} subscriptions
          </Link>
        )}
      </div>
    </SectionCard>
  );
};

const Toolbar = ({ filters, categories }) => (
  <motion.div className="toolbar" variants={fadeUp}>
    <div className="search-wrap">
      <Search size={18} />
      <input
        type="search"
        id="dashboard-search"
        className="search-input"
        placeholder="Search merchants, categories, notes..."
        value={filters.searchQuery}
        onChange={(e) => filters.setSearchQuery(e.target.value)}
      />
    </div>

    <DateRangePicker
      startDate={filters.startDate}
      endDate={filters.endDate}
      setStartDate={filters.setStartDate}
      setEndDate={filters.setEndDate}
    />

    <div className="quick-actions">
      <button
        type="button"
        onClick={filters.setThisMonth}
        className={`chip ${filters.isThisMonth ? 'active' : ''}`}
      >
        This month
      </button>
      <button type="button" onClick={filters.clearDateRange} className="chip">
        All time
      </button>
      {filters.needsReviewCount > 0 && (
        <button
          type="button"
          onClick={() => filters.setNeedsReviewOnly((v) => !v)}
          className={`chip chip-review ${filters.needsReviewOnly ? 'active' : ''}`}
        >
          Needs review ({filters.needsReviewCount})
        </button>
      )}
    </div>

    <select
      className="form-input category-select"
      value={filters.selectedCategory}
      onChange={(e) => filters.setSelectedCategory(e.target.value)}
    >
      <option value="All">All categories</option>
      {categories.map((cat) => (
        <option key={cat.value} value={cat.value}>{cat.label}</option>
      ))}
    </select>
  </motion.div>
);

const BudgetTrackingCardBody = ({ budgets, categories, colors, onSelect }) => {
  const tracked = budgets.filter((c) => c.limit > 0);
  if (tracked.length === 0) {
    return (
      <p className="empty-state">
        No budget limits configured. Open Settings to set monthly limits per category.
      </p>
    );
  }

  return (
    <div className="summary-cards">
      {tracked.map((cat) => (
        <div
          key={cat.value}
          className="budget-row"
          role="button"
          tabIndex={0}
          onClick={() => onSelect(cat.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(cat.value)}
        >
          <div className="budget-row-head">
            <span>{cat.label}</span>
            <span>
              {formatCurrency(cat.spent)} <span className="muted">/ {formatCurrency(cat.limit)}</span>
            </span>
          </div>
          <div className="budget-bar-container">
            <div
              className="budget-bar-fill"
              style={{
                width: `${cat.percentage}%`,
                background: getCategoryColor(cat.value, categories, colors),
                opacity: budgetColorOpacity(cat.percentage),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { transactions, setTransactions, config: appConfig, loading, syncError, syncStatus, refresh, user } = useData();
  const filters = useTransactionFilters(transactions);
  const chartColors = useChartColors();
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();

  const [editing, setEditing] = useState(null);
  const editingRef = useRef(editing);
  const [editFormData, setEditFormData] = useState(null);
  const editFormRef = useRef(editFormData);
  const [saveStatus, setSaveStatus] = useState('idle');
  const savedTimerRef = useRef(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    editFormRef.current = editFormData;
  }, [editFormData]);

  const markSaved = useCallback((ok) => {
    setSaveStatus(ok ? 'saved' : 'error');
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    if (ok) savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
  }, []);

  useEffect(
    () => () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    []
  );

  const openEditModal = useCallback((tx) => {
    setEditing(tx);
    setEditFormData(EMPTY_EDIT_FORM(tx));
    setSaveStatus('idle');
  }, []);

  const closeEditModal = useCallback(() => {
    setEditing(null);
    setEditFormData(null);
    setSaveStatus('idle');
  }, []);

  const persistEdit = useCallback(async () => {
    const originalTx = editingRef.current;
    const form = editFormRef.current;
    if (!originalTx?.id || !form) return false;

    const updated = {
      ...originalTx,
      ...form,
      Amount: parseFloat(form.Amount) || 0,
    };

    setSaveStatus('saving');
    const { ok, error } = await saveTransaction(updated);
    if (!ok) {
      markSaved(false);
      toast.error('Could not save changes', { description: error });
      return false;
    }

    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditing(updated);
    markSaved(true);
    return true;
  }, [markSaved, setTransactions, toast]);

  const { debounced: debouncedPersistEdit } = useDebouncedCallback(persistEdit, 500);

  const handleEditChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setEditFormData((prev) => {
        const next = { ...prev, [name]: value };
        editFormRef.current = next;
        return next;
      });
      debouncedPersistEdit();
    },
    [debouncedPersistEdit]
  );

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const form = editFormRef.current;
      if (!form) return;

      setSaveStatus('saving');
      const upload = await uploadReceipt(file, form.Date);
      if (!upload.ok) {
        markSaved(false);
        toast.error('Receipt upload failed', { description: upload.error });
        return;
      }

      setEditFormData((prev) => {
        const next = { ...prev, ReceiptUrl: upload.receiptUrl };
        editFormRef.current = next;
        return next;
      });
      await persistEdit();
    },
    [markSaved, persistEdit, toast]
  );

  const handleDelete = useCallback(
    async (tx) => {
      if (!tx.id) return;
      const ok = await confirm({
        title: 'Delete transaction?',
        message: `Remove "${tx.Merchant || 'this transaction'}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
      });
      if (!ok) return;
      const { ok: deleted, error } = await deleteTransaction(tx.id);
      if (!deleted) {
        toast.error('Could not delete transaction', { description: error });
        return;
      }
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      toast.success('Transaction deleted');
    },
    [confirm, setTransactions, toast]
  );

  const budgetRange = useMemo(() => {
    if (filters.selectedCard !== 'All' && appConfig?.BILLING_CYCLES?.[filters.selectedCard]) {
      return resolveBillingRange(filters.selectedCard, new Date(), appConfig.BILLING_CYCLES);
    }
    return { start: filters.startDate, end: filters.endDate };
  }, [filters.selectedCard, filters.startDate, filters.endDate, appConfig]);

  const billingContext = useMemo(() => {
    if (filters.selectedCard === 'All' || !appConfig?.BILLING_CYCLES?.[filters.selectedCard]) {
      return null;
    }
    const cycle = appConfig.BILLING_CYCLES[filters.selectedCard];
    const today = new Date();
    const todayIso = todayIsoDate();
    const period = resolveBillingPeriod(filters.selectedCard, today, appConfig.BILLING_CYCLES);
    const prevPeriod = resolvePreviousBillingPeriod(
      filters.selectedCard,
      today,
      appConfig.BILLING_CYCLES
    );
    const paymentDueToday = cycle.type === 'statement' && prevPeriod?.due === todayIso;
    return {
      period,
      isStatement: cycle.type === 'statement',
      paymentDueToday,
      paymentDueStatementEnd: paymentDueToday ? prevPeriod.end : null,
    };
  }, [filters.selectedCard, appConfig]);

  const categoryBudgets = useCategoryBudgets(
    transactions,
    appConfig,
    budgetRange.start,
    budgetRange.end
  );
  const subscriptions = useMemo(
    () => sortByRenewal(getSubscriptions(appConfig, transactions)),
    [appConfig, transactions]
  );

  const pieData = useMemo(() => buildPieData(filters.filteredTransactions), [filters.filteredTransactions]);
  const barData = useMemo(() => buildBarData(filters.filteredTransactions), [filters.filteredTransactions]);
  const insights = useMemo(
    () => buildInsights(filters.filteredTransactions, appConfig),
    [filters.filteredTransactions, appConfig]
  );

  const handleRetry = async () => {
    const result = await refresh();
    if (!result?.ok) toast.error('Sync failed', { description: syncError });
  };

  if (!appConfig && loading) return <LoadingScreen />;
  if (!appConfig) {
    return (
      <PageError
        variant={getPageErrorVariant(syncStatus)}
        title={getPageErrorTitle(syncStatus)}
        description={syncError ?? 'No configuration was found for this profile yet.'}
        onRetry={handleRetry}
        retrying={loading}
      />
    );
  }

  const isInitialSync = loading && transactions.length === 0;

  const { topMerchant, totalRewards, totalSpent } = insights;
  const rewardsLabel = formatRewards(totalRewards);
  const topCategory = pieData[0]?.name || 'N/A';

  return (
    <motion.div className="dashboard" variants={stagger} initial="hidden" animate="show">
      <PageHeader
        eyebrow={`${user.name}'s workspace`}
        title="Overview"
        subtitle="Spending, budgets, and rewards in one calm view."
      />

      {syncError && (
        <SyncBanner
          message={`${syncError}. Showing cached data.`}
          onRetry={handleRetry}
          retrying={loading}
        />
      )}

      <div className="hero-stats">
        <StatCard
          featured
          label="Total spent"
          hint={`${filters.filteredTransactions.length} transactions in view`}
        >
          <AnimatedNumber value={totalSpent} format={formatCurrency} />
        </StatCard>
        <StatCard label="Top category" value={topCategory} hint="Where most money went" />
        <StatCard label="Rewards" value={rewardsLabel} hint="From your card multipliers" />
      </div>

      <Toolbar filters={filters} categories={appConfig.CATEGORIES} />

      <div className="insight-grid">
        <motion.div className="insight-block" variants={fadeUp}>
          <span className="insight-title">Top merchant</span>
          <span className="insight-value">{topMerchant ? topMerchant[0] : 'None'}</span>
          <span className="insight-desc">{topMerchant ? `${formatCurrency(topMerchant[1])} spent` : 'No data'}</span>
        </motion.div>
        <motion.div className="insight-block" variants={fadeUp}>
          <span className="insight-title">Rewards earned</span>
          <span className="insight-value" style={{ fontSize: '1rem' }}>{rewardsLabel}</span>
          <span className="insight-desc">Active multipliers applied</span>
        </motion.div>
        <motion.div className="insight-block" variants={fadeUp}>
          <span className="insight-title">Monthly focus</span>
          <span className="insight-value">{topCategory}</span>
          <span className="insight-desc">Highest spend category</span>
        </motion.div>
      </div>

      <motion.div className="filter-pills" variants={fadeUp}>
        {filters.uniqueCards.map((card) => (
          <button
            key={card}
            type="button"
            className={`pill ${filters.selectedCard === card ? 'active' : ''}`}
            onClick={() => filters.setSelectedCard(card)}
          >
            {card}
          </button>
        ))}
      </motion.div>

      {billingContext && (
        <motion.div className="billing-context-banner" variants={fadeUp}>
          <p className="billing-context-line">
            {billingContext.isStatement ? 'Statement' : 'Billing period'}:{' '}
            {formatDisplayDate(billingContext.period.start)} – {formatDisplayDate(billingContext.period.end)}
            {billingContext.period.due && (
              <> · Due {formatDisplayDate(billingContext.period.due)}</>
            )}
          </p>
          {billingContext.paymentDueToday && (
            <p className="billing-context-due-today">
              Payment due today for statement ending{' '}
              {formatDisplayDate(billingContext.paymentDueStatementEnd)}
            </p>
          )}
        </motion.div>
      )}

      <div className="dashboard-grid">
        <SectionCard title="Budget tracking" className="col-span-full">
          {isInitialSync ? (
            <BudgetSkeleton />
          ) : (
            <BudgetTrackingCardBody
              budgets={categoryBudgets}
              categories={appConfig.CATEGORIES}
              colors={chartColors}
              onSelect={filters.setSelectedCategory}
            />
          )}
        </SectionCard>

        <SectionCard title="By category" className="col-span-4">
          {isInitialSync ? (
            <ChartSkeleton variant="pie" />
          ) : (
            <SpendingPieChart
              data={pieData}
              categories={appConfig.CATEGORIES}
              onCategoryClick={(cat) =>
                filters.setSelectedCategory((prev) => (prev === cat ? 'All' : cat))
              }
            />
          )}
        </SectionCard>

        <SectionCard title="Spending trend" className="col-span-8">
          {isInitialSync ? <ChartSkeleton variant="bar" /> : <SpendingBarChart data={barData} />}
        </SectionCard>

        <SubscriptionsCard subscriptions={subscriptions} categories={appConfig.CATEGORIES} />

        <SectionCard title="Recent activity" className="col-span-full">
          {isInitialSync ? (
            <TransactionListSkeleton />
          ) : filters.filteredTransactions.length === 0 ? (
            <EmptyState
              image={ILLUSTRATIONS.emptyTransactions}
              imageAlt=""
              title={
                transactions.length === 0
                  ? 'No transactions yet'
                  : 'No transactions match these filters'
              }
            >
              {transactions.length === 0 ? (
                <Link to="/add" className="inline-link">
                  Add your first transaction
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    filters.setSearchQuery('');
                    filters.setSelectedCategory('All');
                    filters.setSelectedCard('All');
                    filters.setNeedsReviewOnly(false);
                    filters.clearDateRange();
                  }}
                >
                  Clear filters
                </button>
              )}
            </EmptyState>
          ) : (
            <div className="transaction-list">
              {filters.filteredTransactions.slice(0, MAX_VISIBLE_TRANSACTIONS).map((t, i) => (
                <TransactionItem
                  key={t.id || `${t.Date}-${t.Merchant}-${i}`}
                  transaction={t}
                  index={i}
                  appConfig={appConfig}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onViewReceipt={setViewingReceipt}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <EditTransactionModal
            open={Boolean(editing && editFormData)}
            formData={editFormData}
            appConfig={appConfig}
            onChange={handleEditChange}
            onFile={handleFileChange}
            onClose={closeEditModal}
            saveStatus={saveStatus}
          />

      <ReceiptLightbox
        open={Boolean(viewingReceipt)}
        src={viewingReceipt}
        onClose={() => setViewingReceipt(null)}
      />

      {confirmDialog}
    </motion.div>
  );
};

export default Dashboard;
