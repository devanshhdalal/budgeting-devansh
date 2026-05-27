import { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Search, Upload, Image as ImageIcon, Calendar } from 'lucide-react';
import { saveTransaction, deleteTransaction, uploadReceipt } from '../services/storage';
import { SpendingPieChart, SpendingBarChart } from '../components/Charts';
import TransactionItem from '../components/TransactionItem';
import { CategoryIcon } from '../utils/categoryIcons';
import { formatDisplayDate, todayIsoDate } from '../utils/date';
import { formatCurrency } from '../utils/format';
import { matchesDateRange } from '../utils/filters';
import DateField from '../components/DateField';
import { buildPieData, buildBarData, buildInsights } from '../utils/chartData';
import { useAppData } from '../hooks/useAppData';
import { useTransactionFilters } from '../hooks/useTransactionFilters';
import { MAX_VISIBLE_TRANSACTIONS } from '../constants';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const Dashboard = () => {
  const { transactions, setTransactions, appConfig, loading, syncError } = useAppData();
  const filters = useTransactionFilters(transactions);

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  const openEditModal = useCallback((transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      id: transaction.id,
      Merchant: transaction.Merchant || '',
      Amount: transaction.Amount || 0,
      Date: transaction.Date || todayIsoDate(),
      Category: transaction.Category || 'Other',
      Card: transaction.Card || '',
      Notes: transaction.Notes || '',
      ReceiptUrl: transaction.ReceiptUrl || '',
    });
    setReceiptFile(null);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingTransaction(null);
    setEditFormData(null);
    setReceiptFile(null);
  }, []);

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleFileChange = useCallback((e) => {
    if (e.target.files?.[0]) setReceiptFile(e.target.files[0]);
  }, []);

  const handleEditSave = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    let receiptUrl = editFormData.ReceiptUrl;
    if (receiptFile) {
      const uploadedUrl = await uploadReceipt(receiptFile, editFormData.Date);
      if (uploadedUrl) receiptUrl = uploadedUrl;
    }

    const updatedTransaction = {
      ...editingTransaction,
      ...editFormData,
      Amount: parseFloat(editFormData.Amount) || 0,
      ReceiptUrl: receiptUrl,
    };

    const success = await saveTransaction(updatedTransaction);
    if (success) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === updatedTransaction.id ? updatedTransaction : t))
      );
    }

    setIsUploading(false);
    closeEditModal();
  };

  const handleDelete = useCallback(
    async (transaction) => {
      if (!transaction.id) return;
      if (!window.confirm('Are you sure you want to delete this transaction?')) return;

      const success = await deleteTransaction(transaction.id);
      if (success) {
        setTransactions((prev) => prev.filter((t) => t.id !== transaction.id));
      }
    },
    [setTransactions]
  );

  const categoryBudgets = useMemo(() => {
    if (!appConfig) return [];
    return appConfig.CATEGORIES.map((cat) => {
      const spent = transactions
        .filter(
          (t) =>
            t.Category === cat.value &&
            matchesDateRange(t.Date, filters.startDate, filters.endDate)
        )
        .reduce((sum, t) => sum + (t.Amount || 0), 0);
      const limit = appConfig.BUDGET_CONFIG[cat.value] || 0;
      const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
      return { ...cat, spent, limit, percentage };
    });
  }, [transactions, appConfig, filters.startDate, filters.endDate]);

  const pieData = useMemo(
    () => buildPieData(filters.filteredTransactions),
    [filters.filteredTransactions]
  );

  const barData = useMemo(
    () => buildBarData(filters.filteredTransactions),
    [filters.filteredTransactions]
  );

  const insights = useMemo(
    () => buildInsights(filters.filteredTransactions, appConfig),
    [filters.filteredTransactions, appConfig]
  );

  const subscriptionData = useMemo(() => {
    const subs = transactions
      .filter((t) => t.Category === 'Subscriptions')
      .reduce((acc, t) => {
        if (!acc[t.Merchant] || new Date(t.Date) > new Date(acc[t.Merchant].Date)) {
          acc[t.Merchant] = t;
        }
        return acc;
      }, {});

    const subList = Object.values(subs).sort((a, b) => (a.Amount || 0) - (b.Amount || 0));
    const monthlyBurnRate = subList.reduce((sum, s) => sum + (s.Amount || 0), 0);
    return { subList, monthlyBurnRate };
  }, [transactions]);

  if (loading || !appConfig) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading...</div>;
  }

  const { topMerchant, totalRewards, totalSpent } = insights;
  const { subList, monthlyBurnRate } = subscriptionData;

  return (
    <motion.div className="dashboard-grid" variants={containerVariants} initial="hidden" animate="show">
      {syncError && (
        <motion.div className="col-span-full" variants={itemVariants} style={{ padding: '12px 16px', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent-primary)', fontSize: '14px', fontWeight: 600 }}>
          Could not reach the server — showing cached data. Run <code style={{ fontWeight: 700 }}>npm run dev</code> or <code style={{ fontWeight: 700 }}>npm start</code> so transactions save to disk.
        </motion.div>
      )}
      <motion.div className="col-span-full" variants={itemVariants} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
        <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search merchants, categories, or notes..."
            className="form-input"
            style={{ paddingLeft: '44px', borderRadius: '24px' }}
            value={filters.searchQuery}
            onChange={(e) => filters.setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="date-range-pill">
            <div className="date-range-input-wrapper">
              <Calendar size={14} className="date-icon" />
              <div className="date-display-container" onClick={() => startDateRef.current?.showPicker()}>
                <span className="date-display-text">{formatDisplayDate(filters.startDate) || 'Start Date'}</span>
                <input
                  type="date"
                  ref={startDateRef}
                  className="date-picker-hidden"
                  value={filters.startDate}
                  onChange={(e) => filters.setStartDate(e.target.value)}
                />
              </div>
            </div>
            <div className="date-separator">to</div>
            <div className="date-range-input-wrapper">
              <div className="date-display-container" onClick={() => endDateRef.current?.showPicker()}>
                <span className="date-display-text">{formatDisplayDate(filters.endDate) || 'End Date'}</span>
                <input
                  type="date"
                  ref={endDateRef}
                  className="date-picker-hidden"
                  value={filters.endDate}
                  onChange={(e) => filters.setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="quick-actions">
            <button onClick={filters.setThisMonth} className={`chip ${filters.startDate && filters.endDate ? 'active' : ''}`}>
              This Month
            </button>
            <button onClick={filters.clearDateRange} className="chip">
              All Time
            </button>
          </div>
        </div>

        <select
          className="form-input"
          style={{ width: 'auto', borderRadius: '24px', padding: '10px 16px' }}
          value={filters.selectedCategory}
          onChange={(e) => filters.setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {appConfig.CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </motion.div>

      <motion.div className="col-span-full insight-grid" variants={itemVariants}>
        <div className="insight-card">
          <span className="insight-title">Top Merchant</span>
          <span className="insight-value">{topMerchant ? topMerchant[0] : 'None'}</span>
          <span className="insight-desc">{topMerchant ? `$${topMerchant[1].toFixed(2)} spent` : 'No data'}</span>
        </div>
        <div className="insight-card">
          <span className="insight-title">Rewards Earned</span>
          <div className="insight-value" style={{ fontSize: '16px' }}>
            {Object.keys(totalRewards).length > 0
              ? Object.entries(totalRewards).map(([curr, val]) => (
                  <div key={curr}>+{val} {curr}</div>
                ))
              : '0 Points'}
          </div>
          <span className="insight-desc">Based on active multipliers</span>
        </div>
        <div className="insight-card">
          <span className="insight-title">Monthly Focus</span>
          <span className="insight-value">{pieData[0]?.name || 'N/A'}</span>
          <span className="insight-desc">Highest spending category</span>
        </div>
      </motion.div>

      <motion.div className="col-span-full" variants={itemVariants} style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px' }}>
        {filters.uniqueCards.map((card) => (
          <button
            key={card}
            onClick={() => filters.setSelectedCard(card)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: `1px solid ${filters.selectedCard === card ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              background: filters.selectedCard === card ? 'var(--accent-light)' : 'var(--surface-color)',
              color: filters.selectedCard === card ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '14px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {card}
          </button>
        ))}
      </motion.div>

      <motion.div className="col-span-full card" variants={itemVariants} style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Budget Tracking</h3>
        <div className="summary-cards" style={{ gap: '24px' }}>
          {categoryBudgets.filter((c) => c.limit > 0).map((cat) => (
            <div key={cat.value} onClick={() => filters.setSelectedCategory(cat.value)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{cat.label}</span>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>
                  ${cat.spent.toFixed(0)} <span style={{ opacity: 0.5, fontWeight: 400 }}>/ ${cat.limit}</span>
                </span>
              </div>
              <div className="budget-bar-container">
                <div
                  className="budget-bar-fill"
                  style={{
                    width: `${cat.percentage}%`,
                    background: cat.percentage > 90 ? 'var(--accent-primary)' : cat.percentage > 70 ? '#f59e0b' : 'var(--success)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div className="col-span-full summary-cards" variants={itemVariants} style={{ marginBottom: '16px' }}>
        <div className="card stat-card glass-panel">
          <span className="stat-title">Total Spent</span>
          <span className="stat-value">{formatCurrency(totalSpent)}</span>
        </div>
        <div className="card stat-card glass-panel">
          <span className="stat-title">Transactions</span>
          <span className="stat-value">{filters.filteredTransactions.length}</span>
        </div>
        <div className="card stat-card glass-panel">
          <span className="stat-title">Top Category</span>
          <span className="stat-value">{pieData[0]?.name || 'N/A'}</span>
        </div>
      </motion.div>

      <motion.div className="col-span-4 card" variants={itemVariants}>
        <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Spending by Category</h3>
        <SpendingPieChart
          data={pieData}
          onCategoryClick={(cat) => filters.setSelectedCategory((prev) => (prev === cat ? 'All' : cat))}
        />
      </motion.div>

      <motion.div className="col-span-8 card" variants={itemVariants}>
        <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Recent Trend</h3>
        <SpendingBarChart data={barData} />
      </motion.div>

      <motion.div className="col-span-4 card" variants={itemVariants}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px' }}>Subscriptions</h3>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>
            ${monthlyBurnRate.toFixed(2)}/mo
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {subList.length > 0 ? (
            subList.map((sub) => (
              <div
                key={sub.id || sub.Merchant}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                    <CategoryIcon category="Subscriptions" categories={appConfig.CATEGORIES} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{sub.Merchant}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>Recurring</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{formatCurrency(sub.Amount)}</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', opacity: 0.5, fontSize: '14px' }}>
              No subscriptions found
            </div>
          )}
        </div>
      </motion.div>

      <motion.div className="col-span-full card" variants={itemVariants} style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '24px' }}>Transaction History</h3>
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
      </motion.div>

      <AnimatePresence>
        {editingTransaction && editFormData && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <button className="modal-close" onClick={closeEditModal}><X size={24} /></button>
              <h2 style={{ marginBottom: '24px', fontSize: '20px' }}>Edit Transaction</h2>

              <form onSubmit={handleEditSave}>
                <div className="form-group">
                  <label className="form-label">Merchant</label>
                  <input type="text" name="Merchant" className="form-input" value={editFormData.Merchant} onChange={handleEditChange} required />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Amount ($)</label>
                    <input type="number" name="Amount" step="0.01" className="form-input" value={editFormData.Amount} onChange={handleEditChange} required />
                  </div>
                  <DateField label="Date" name="Date" value={editFormData.Date} onChange={handleEditChange} />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select name="Category" className="form-input" value={editFormData.Category} onChange={handleEditChange} required>
                      {appConfig.CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Card</label>
                    <select name="Card" className="form-input" value={editFormData.Card} onChange={handleEditChange}>
                      <option value="">Select a Card...</option>
                      {Object.keys(appConfig.CARDS).map((card) => (
                        <option key={card} value={card}>{card}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <input type="text" name="Notes" className="form-input" placeholder="Add a note..." value={editFormData.Notes} onChange={handleEditChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Receipt (Optional)</label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      border: '1px dashed var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      color: receiptFile || editFormData.ReceiptUrl ? 'var(--text-primary)' : 'var(--text-secondary)',
                      backgroundColor: receiptFile ? 'var(--accent-light)' : 'transparent',
                    }}
                  >
                    {receiptFile || editFormData.ReceiptUrl ? <ImageIcon size={20} color="var(--accent-primary)" /> : <Upload size={20} />}
                    <span style={{ fontSize: '15px' }}>
                      {receiptFile ? receiptFile.name : editFormData.ReceiptUrl ? 'Update existing receipt' : 'Click to upload receipt image'}
                    </span>
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={isUploading}>
                  {isUploading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingReceipt && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingReceipt(null)}>
            <motion.div
              className="modal-content"
              style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', background: 'transparent', boxShadow: 'none' }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setViewingReceipt(null)}
                style={{ top: '-16px', right: '-16px', background: 'var(--surface-color)', borderRadius: '50%', padding: '8px', boxShadow: 'var(--shadow-md)' }}
              >
                <X size={24} />
              </button>
              <img src={viewingReceipt} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 'var(--radius-md)', objectFit: 'contain' }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;
