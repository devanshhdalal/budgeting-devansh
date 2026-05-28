import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Search, Upload, Image as ImageIcon, Calendar } from 'lucide-react';
import { saveTransaction, deleteTransaction, uploadReceipt } from '../services/storage';
import { SpendingPieChart, SpendingBarChart } from '../components/Charts';
import { useChartColors } from '../hooks/useChartColors';
import { getCategoryColor } from '../utils/chartTheme';
import TransactionItem from '../components/TransactionItem';
import { CategoryIcon } from '../utils/categoryIcons';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import SectionCard from '../components/ui/SectionCard';
import { formatDisplayDate, todayIsoDate } from '../utils/date';
import { formatCurrency } from '../utils/format';
import { matchesDateRange } from '../utils/filters';
import DateField from '../components/DateField';
import { buildPieData, buildBarData, buildInsights } from '../utils/chartData';
import { useData } from '../hooks/useData';
import { useToast } from '../hooks/useToast';
import { useTransactionFilters } from '../hooks/useTransactionFilters';
import { MAX_VISIBLE_TRANSACTIONS } from '../constants';
import { stagger, fadeUp } from '../motion/presets';
import LoadingScreen from '../components/layout/LoadingScreen';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import Skeleton from '../components/ui/Skeleton';
import PageError from '../components/ui/PageError';

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
  return entries.map(([currency, value]) => `+${value} ${currency}`).join(' · ');
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

const useSubscriptions = (transactions) =>
  useMemo(() => {
    const latestByMerchant = new Map();
    for (const t of transactions) {
      if (t.Category !== 'Subscriptions' || !t.Merchant) continue;
      const existing = latestByMerchant.get(t.Merchant);
      if (!existing || new Date(t.Date) > new Date(existing.Date)) {
        latestByMerchant.set(t.Merchant, t);
      }
    }

    const subList = [...latestByMerchant.values()].sort((a, b) => (a.Amount || 0) - (b.Amount || 0));
    const monthlyBurnRate = subList.reduce((sum, s) => sum + (s.Amount || 0), 0);
    return { subList, monthlyBurnRate };
  }, [transactions]);

const DateRangePicker = ({ startDate, endDate, setStartDate, setEndDate }) => {
  const startRef = useRef(null);
  const endRef = useRef(null);

  return (
    <div className="date-range-pill">
      <div className="date-range-input-wrapper">
        <Calendar size={14} className="date-icon" />
        <div className="date-display-container" onClick={() => startRef.current?.showPicker?.()}>
          <span className="date-display-text">{formatDisplayDate(startDate) || 'Start'}</span>
          <input
            ref={startRef}
            type="date"
            className="date-picker-hidden"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>
      <span className="date-separator">to</span>
      <div className="date-range-input-wrapper">
        <div className="date-display-container" onClick={() => endRef.current?.showPicker?.()}>
          <span className="date-display-text">{formatDisplayDate(endDate) || 'End'}</span>
          <input
            ref={endRef}
            type="date"
            className="date-picker-hidden"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

const Toolbar = ({ filters, categories }) => (
  <motion.div className="toolbar" variants={fadeUp}>
    <div className="search-wrap">
      <Search size={18} />
      <input
        type="search"
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
        className={`chip ${filters.startDate && filters.endDate ? 'active' : ''}`}
      >
        This month
      </button>
      <button type="button" onClick={filters.clearDateRange} className="chip">
        All time
      </button>
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

const SubscriptionsCard = ({ subList, monthlyBurnRate, categories }) => (
  <SectionCard
    title="Subscriptions"
    className="col-span-4"
    action={<span className="sub-amount">{formatCurrency(monthlyBurnRate)}/mo</span>}
  >
    <div className="sub-list">
      {subList.length === 0 && <p className="empty-state">No subscriptions yet</p>}
      {subList.map((sub) => (
        <div key={sub.id || sub.Merchant} className="sub-row">
          <div className="sub-row-left">
            <div className="sub-icon">
              <CategoryIcon category="Subscriptions" categories={categories} />
            </div>
            <div>
              <div className="sub-name">{sub.Merchant}</div>
              <div className="sub-tag">Recurring</div>
            </div>
          </div>
          <span className="sub-amount">{formatCurrency(sub.Amount)}</span>
        </div>
      ))}
    </div>
  </SectionCard>
);

const EditTransactionModal = ({ transaction, formData, onChange, onSave, onClose, onFile, file, isUploading, appConfig }) => (
  <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div
      className="modal-content modal-content-wide"
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
    >
      <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
        <X size={22} />
      </button>
      <h2 className="page-title" style={{ fontSize: '1.35rem', marginBottom: '24px' }}>Edit transaction</h2>
      <form onSubmit={(e) => onSave(e, transaction)}>
        <div className="form-group">
          <label className="form-label">Merchant</label>
          <input type="text" name="Merchant" className="form-input" value={formData.Merchant} onChange={onChange} required />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input type="number" name="Amount" step="0.01" className="form-input" value={formData.Amount} onChange={onChange} required />
          </div>
          <DateField label="Date" name="Date" value={formData.Date} onChange={onChange} />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select name="Category" className="form-input" value={formData.Category} onChange={onChange} required>
              {appConfig.CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Card</label>
            <select name="Card" className="form-input" value={formData.Card} onChange={onChange}>
              <option value="">Select card</option>
              {Object.keys(appConfig.CARDS).map((card) => (
                <option key={card} value={card}>{card}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <input type="text" name="Notes" className="form-input" placeholder="Optional" value={formData.Notes} onChange={onChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Receipt</label>
          <label className={`upload-zone ${file || formData.ReceiptUrl ? 'upload-zone-active' : ''}`}>
            {file || formData.ReceiptUrl ? <ImageIcon size={20} /> : <Upload size={20} />}
            <span>
              {file ? file.name : formData.ReceiptUrl ? 'Update receipt' : 'Upload image'}
            </span>
            <input type="file" accept="image/*" onChange={onFile} hidden />
          </label>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isUploading}>
          {isUploading ? 'Saving...' : <><Save size={18} /> Save changes</>}
        </button>
      </form>
    </motion.div>
  </motion.div>
);

const TransactionListSkeleton = () => (
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

const ChartSkeleton = ({ variant = 'bar' }) => (
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

const BudgetSkeleton = () => (
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

const SyncBanner = ({ message, onRetry, retrying }) => (
  <motion.div className="banner banner-warn" variants={fadeUp} role="alert">
    <span className="banner-text">{message}</span>
    <button
      type="button"
      className="banner-action"
      onClick={onRetry}
      disabled={retrying}
    >
      {retrying ? 'Retrying...' : 'Retry sync'}
    </button>
  </motion.div>
);

const ReceiptLightbox = ({ src, onClose }) => {
  const [status, setStatus] = useState('loading');
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal-content modal-lightbox"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>
        {status === 'loading' && (
          <div className="lightbox-loading" aria-live="polite">
            <div className="loading-mark" aria-hidden />
            <span>Loading receipt</span>
          </div>
        )}
        {status === 'error' && (
          <div className="lightbox-error" role="alert">
            <p>Could not load this receipt image.</p>
            <a className="btn btn-ghost" href={src} target="_blank" rel="noreferrer">Open original</a>
          </div>
        )}
        <img
          src={src}
          alt="Receipt"
          style={{ display: status === 'loaded' ? 'block' : 'none' }}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      </motion.div>
    </motion.div>
  );
};

const Dashboard = () => {
  const { transactions, setTransactions, config: appConfig, loading, syncError, refresh, user } = useData();
  const filters = useTransactionFilters(transactions);
  const chartColors = useChartColors();
  const toast = useToast();

  const [editing, setEditing] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  const openEditModal = useCallback((tx) => {
    setEditing(tx);
    setEditFormData(EMPTY_EDIT_FORM(tx));
    setReceiptFile(null);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditing(null);
    setEditFormData(null);
    setReceiptFile(null);
  }, []);

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) setReceiptFile(file);
  }, []);

  const handleEditSave = async (e, originalTx) => {
    e.preventDefault();
    setIsUploading(true);

    let receiptUrl = editFormData.ReceiptUrl;
    if (receiptFile) {
      const upload = await uploadReceipt(receiptFile, editFormData.Date);
      if (upload.ok) {
        receiptUrl = upload.receiptUrl;
      } else {
        toast.error('Receipt upload failed', { description: upload.error });
      }
    }

    const updated = {
      ...originalTx,
      ...editFormData,
      Amount: parseFloat(editFormData.Amount) || 0,
      ReceiptUrl: receiptUrl,
    };

    const { ok, error } = await saveTransaction(updated);
    setIsUploading(false);
    if (!ok) {
      toast.error('Could not save changes', { description: error });
      return;
    }
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    toast.success('Transaction updated');
    closeEditModal();
  };

  const handleDelete = useCallback(
    async (tx) => {
      if (!tx.id) return;
      if (!window.confirm('Delete this transaction?')) return;
      const { ok, error } = await deleteTransaction(tx.id);
      if (!ok) {
        toast.error('Could not delete transaction', { description: error });
        return;
      }
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      toast.success('Transaction deleted');
    },
    [setTransactions, toast]
  );

  const categoryBudgets = useCategoryBudgets(transactions, appConfig, filters.startDate, filters.endDate);
  const { subList, monthlyBurnRate } = useSubscriptions(transactions);

  const pieData = useMemo(() => buildPieData(filters.filteredTransactions), [filters.filteredTransactions]);
  const barData = useMemo(() => buildBarData(filters.filteredTransactions), [filters.filteredTransactions]);
  const insights = useMemo(
    () => buildInsights(filters.filteredTransactions, appConfig),
    [filters.filteredTransactions, appConfig]
  );

  const handleRetry = () => {
    toast.info('Retrying sync...');
    refresh();
  };

  if (!appConfig && loading) return <LoadingScreen />;
  if (!appConfig) {
    return (
      <PageError
        variant="network"
        title="We could not load your workspace"
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
        <motion.div className="insight-card" variants={fadeUp}>
          <span className="insight-title">Top merchant</span>
          <span className="insight-value">{topMerchant ? topMerchant[0] : 'None'}</span>
          <span className="insight-desc">{topMerchant ? `${formatCurrency(topMerchant[1])} spent` : 'No data'}</span>
        </motion.div>
        <motion.div className="insight-card" variants={fadeUp}>
          <span className="insight-title">Rewards earned</span>
          <span className="insight-value" style={{ fontSize: '1rem' }}>{rewardsLabel}</span>
          <span className="insight-desc">Active multipliers applied</span>
        </motion.div>
        <motion.div className="insight-card" variants={fadeUp}>
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

        <SubscriptionsCard
          subList={subList}
          monthlyBurnRate={monthlyBurnRate}
          categories={appConfig.CATEGORIES}
        />

        <SectionCard title="Recent activity" className="col-span-full">
          {isInitialSync ? (
            <TransactionListSkeleton />
          ) : filters.filteredTransactions.length === 0 ? (
            <p className="empty-state">
              {transactions.length === 0
                ? 'No transactions yet. Add one to get started.'
                : 'No transactions match these filters.'}
            </p>
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

      <AnimatePresence>
        {editing && editFormData && (
          <EditTransactionModal
            transaction={editing}
            formData={editFormData}
            file={receiptFile}
            isUploading={isUploading}
            appConfig={appConfig}
            onChange={handleEditChange}
            onFile={handleFileChange}
            onSave={handleEditSave}
            onClose={closeEditModal}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingReceipt && (
          <ReceiptLightbox src={viewingReceipt} onClose={() => setViewingReceipt(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;
