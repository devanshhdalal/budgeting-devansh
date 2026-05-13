import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Coffee, Car, HeartPulse, Home, MoreHorizontal, Pencil, X, Save, Trash2, Search, Receipt, Upload, Image as ImageIcon, Plane, Calendar } from 'lucide-react';
import { fetchTransactions, saveTransaction, deleteTransaction, uploadReceipt, fetchConfig } from '../services/storage';
import { SpendingPieChart, SpendingBarChart } from '../components/Charts';
import { calculateRewards } from '../config/rewards';

// Icon resolver: maps icon string names from config to Lucide components
const ICON_MAP = { Coffee, Car, HeartPulse, Home, ShoppingBag, MoreHorizontal, Plane };

// Display limits
const MAX_VISIBLE_TRANSACTIONS = 15;
const MAX_BAR_CHART_DAYS = 10;

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Get time values with timezone offset adjustment to prevent off-by-one day errors
  const dt = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Memoized Transaction Item for performance
const TransactionItem = React.memo(({ t, i, getCategoryIcon, formatDate, calculateRewards, viewingReceipt, setViewingReceipt, openEditModal, handleDelete, appConfig }) => {
  const rewards = calculateRewards(t.Card, t.Category, t.Amount, t.Merchant, appConfig.CARDS, appConfig.MERCHANT_REWARDS_OVERRIDES);
  return (
    <motion.div 
      className="transaction-item"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.3) }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="transaction-icon">
          {getCategoryIcon(t.Category)}
        </div>
        <div className="transaction-details">
          <div className="transaction-merchant">{t.Merchant || 'Unknown Merchant'}</div>
          <div className="transaction-category">
            {t.Category || 'Other'} • {formatDate(t.Date)}
            {t.Notes && <span style={{ marginLeft: '8px', opacity: 0.7 }}>- {t.Notes}</span>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="transaction-actions">
          {t.ReceiptUrl && (
            <button className="action-btn" onClick={() => setViewingReceipt(t.ReceiptUrl)} title="View Receipt">
              <Receipt size={18} />
            </button>
          )}
          <button className="action-btn" onClick={() => openEditModal(t, t.originalIndex)} title="Edit Transaction">
            <Pencil size={18} />
          </button>
          <button className="action-btn" onClick={() => handleDelete(t.originalIndex)} title="Delete Transaction" style={{ color: 'var(--accent-primary)' }}>
            <Trash2 size={18} />
          </button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="transaction-amount">
            ${(t.Amount || 0).toFixed(2)}
          </div>
          {rewards && (
            <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>
              +{rewards.points} {rewards.currency}
              {rewards.note && (
                <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 400, marginTop: '2px' }}>
                  {rewards.note}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [appConfig, setAppConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  
  // Edit Modal State
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Viewer State
  const [viewingReceipt, setViewingReceipt] = useState(null);

  useEffect(() => {
    // Try to load from cache first for instant UI
    const cachedTrans = localStorage.getItem('cache_transactions');
    const cachedConfig = localStorage.getItem('cache_config');
    
    if (cachedTrans) setTransactions(JSON.parse(cachedTrans));
    if (cachedConfig) {
      setAppConfig(JSON.parse(cachedConfig));
      setLoading(false);
    }

    const loadData = async () => {
      try {
        const [transData, configData] = await Promise.all([
          fetchTransactions(),
          fetchConfig()
        ]);
        
        if (transData) {
          setTransactions(transData);
          localStorage.setItem('cache_transactions', JSON.stringify(transData));
        }
        if (configData) {
          setAppConfig(configData);
          localStorage.setItem('cache_config', JSON.stringify(configData));
        }
      } catch (err) {
        console.error('Failed to sync data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getCategoryIcon = (category) => {
    if (!appConfig) return <MoreHorizontal size={24} />;
    const cat = appConfig.CATEGORIES.find(c => c.value.toLowerCase() === category?.toLowerCase());
    const iconName = cat?.icon || 'MoreHorizontal';
    const IconComponent = ICON_MAP[iconName] || MoreHorizontal;
    return <IconComponent size={24} />;
  };

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
  };

  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
  };

  const openEditModal = (t, index) => {
    setEditingTransaction(index);
    setEditFormData({
      Merchant: t.Merchant || '',
      Amount: t.Amount || 0,
      Date: t.Date || new Date().toISOString().split('T')[0],
      Category: t.Category || 'Other',
      Card: t.Card || '',
      Notes: t.Notes || '',
      ReceiptUrl: t.ReceiptUrl || ''
    });
    setReceiptFile(null);
  };

  const closeEditModal = () => {
    setEditingTransaction(null);
    setEditFormData(null);
    setReceiptFile(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    
    let receiptUrl = editFormData.ReceiptUrl;
    if (receiptFile) {
      const uploadedUrl = await uploadReceipt(receiptFile, editFormData.Date);
      if (uploadedUrl) receiptUrl = uploadedUrl;
    }
    
    const updatedTransaction = { 
      ...transactions[editingTransaction], 
      ...editFormData, 
      Amount: parseFloat(editFormData.Amount) || 0,
      ReceiptUrl: receiptUrl 
    };
    
    // Update local state
    const newTransactions = [...transactions];
    newTransactions[editingTransaction] = updatedTransaction;
    
    const success = await saveTransaction({ ...updatedTransaction, _index: editingTransaction });
    if (success) {
      setTransactions(newTransactions);
    }
    
    setIsUploading(false);
    closeEditModal();
  };

  const handleDelete = async (index) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      const newTransactions = [...transactions];
      newTransactions.splice(index, 1);
      setTransactions(newTransactions);
      await deleteTransaction(index);
    }
  };

  if (loading || !appConfig) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading...</div>;
  }

  const transactionsWithIndex = useMemo(() => 
    transactions.map((t, index) => ({ ...t, originalIndex: index })),
  [transactions]);
  
  const filteredTransactions = useMemo(() => {
    return transactionsWithIndex.filter(t => {
      const matchCard = selectedCard === 'All' || t.Card === selectedCard;
      
      let matchDate = true;
      if (startDate && t.Date) matchDate = matchDate && t.Date >= startDate;
      if (endDate && t.Date) matchDate = matchDate && t.Date <= endDate;
      
      const matchCategory = selectedCategory === 'All' || t.Category === selectedCategory;
      const query = searchQuery.toLowerCase();
      const matchSearch = query === '' || 
        (t.Merchant && t.Merchant.toLowerCase().includes(query)) ||
        (t.Category && t.Category.toLowerCase().includes(query)) ||
        (t.Notes && t.Notes.toLowerCase().includes(query));
      
      return matchCard && matchDate && matchCategory && matchSearch;
    });
  }, [transactionsWithIndex, selectedCard, startDate, endDate, selectedCategory, searchQuery]);

  // Calculate category budgets
  const categoryBudgets = useMemo(() => {
    if (!appConfig) return [];
    return appConfig.CATEGORIES.map(cat => {
      const spent = transactions
        .filter(t => {
          let matchDate = true;
          if (startDate && t.Date) matchDate = matchDate && t.Date >= startDate;
          if (endDate && t.Date) matchDate = matchDate && t.Date <= endDate;
          return t.Category === cat.value && matchDate;
        })
        .reduce((sum, t) => sum + (t.Amount || 0), 0);
      const limit = appConfig.BUDGET_CONFIG[cat.value] || 0;
      const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
      return { ...cat, spent, limit, percentage };
    });
  }, [transactions, appConfig, startDate, endDate]);

  // Smart Insights Logic
  const insights = useMemo(() => {
    const topMerchant = Object.entries(
      filteredTransactions.reduce((acc, t) => {
        if (!t.Merchant) return acc;
        acc[t.Merchant] = (acc[t.Merchant] || 0) + (t.Amount || 0);
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0];

    const totalRewards = filteredTransactions.reduce((acc, t) => {
      const r = calculateRewards(t.Card, t.Category, t.Amount, t.Merchant, appConfig?.CARDS, appConfig?.MERCHANT_REWARDS_OVERRIDES);
      if (!r || typeof r.points !== 'number') return acc;
      const currency = r.currency || 'Points';
      acc[currency] = (acc[currency] || 0) + r.points;
      return acc;
    }, {});

    const totalSpent = filteredTransactions.reduce((sum, t) => sum + (t.Amount || 0), 0);

    return { topMerchant, totalRewards, totalSpent };
  }, [filteredTransactions, appConfig]);

  // Group by category for Pie Chart
  const pieData = useMemo(() => {
    const categoryMap = {};
    filteredTransactions.forEach(t => {
      const cat = t.Category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + (t.Amount || 0);
    });
    return Object.keys(categoryMap)
      .map(key => ({ name: key, value: categoryMap[key] }))
      .sort((a,b) => b.value - a.value);
  }, [filteredTransactions]);

  // Group by date for Bar Chart
  const barData = useMemo(() => {
    const dateMap = {};
    filteredTransactions.forEach(t => {
      if(!t.Date) return;
      const dateStr = new Date(t.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[dateStr] = (dateMap[dateStr] || 0) + (t.Amount || 0);
    });
    return Object.keys(dateMap)
      .sort((a,b) => new Date(a) - new Date(b))
      .slice(-MAX_BAR_CHART_DAYS)
      .map(key => ({ name: key, amount: dateMap[key] }));
  }, [filteredTransactions]);

  // Subscription Logic
  const subscriptionData = useMemo(() => {
    const subs = transactions
      .filter(t => t.Category === 'Subscriptions')
      .reduce((acc, t) => {
        if (!acc[t.Merchant] || new Date(t.Date) > new Date(acc[t.Merchant].Date)) {
          acc[t.Merchant] = t;
        }
        return acc;
      }, {});
    
    const subList = Object.values(subs).sort((a,b) => (a.Amount || 0) - (b.Amount || 0));
    const monthlyBurnRate = subList.reduce((sum, s) => sum + (s.Amount || 0), 0);
    return { subList, monthlyBurnRate };
  }, [transactions]);

  const uniqueCards = useMemo(() => 
    ['All', ...new Set(transactions.map(t => t.Card).filter(Boolean))],
  [transactions]);

  // Destructure for ease of use
  const { topMerchant, totalRewards, totalSpent } = insights;
  const { subList, monthlyBurnRate } = subscriptionData;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="dashboard-grid"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Filters & Search Header */}
      <motion.div className="col-span-full" variants={itemVariants} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
        <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search merchants, categories, or notes..." 
            className="form-input"
            style={{ paddingLeft: '44px', borderRadius: '24px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="date-range-pill">
            <div className="date-range-input-wrapper">
              <Calendar size={14} className="date-icon" />
              <div className="date-display-container" onClick={() => startDateRef.current?.showPicker()}>
                <span className="date-display-text">{formatDate(startDate) || 'Start Date'}</span>
                <input 
                  type="date" 
                  ref={startDateRef}
                  className="date-picker-hidden"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
            <div className="date-separator">to</div>
            <div className="date-range-input-wrapper">
              <div className="date-display-container" onClick={() => endDateRef.current?.showPicker()}>
                <span className="date-display-text">{formatDate(endDate) || 'End Date'}</span>
                <input 
                  type="date" 
                  ref={endDateRef}
                  className="date-picker-hidden"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="quick-actions">
            <button onClick={setThisMonth} className={`chip ${startDate && endDate ? 'active' : ''}`}>
              This Month
            </button>
            <button onClick={clearDateRange} className="chip">
              All Time
            </button>
          </div>
        </div>

        <select 
          className="form-input" 
          style={{ width: 'auto', borderRadius: '24px', padding: '10px 16px' }}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {appConfig.CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </motion.div>

      {/* Smart Insights Row */}
      <motion.div className="col-span-full insight-grid" variants={itemVariants}>
        <div className="insight-card">
          <span className="insight-title">Top Merchant</span>
          <span className="insight-value">{topMerchant ? topMerchant[0] : 'None'}</span>
          <span className="insight-desc">{topMerchant ? `$${topMerchant[1].toFixed(2)} spent` : 'No data'}</span>
        </div>
        <div className="insight-card">
          <span className="insight-title">Rewards Earned</span>
          <div className="insight-value" style={{ fontSize: '16px' }}>
            {Object.keys(totalRewards).length > 0 ? 
              Object.entries(totalRewards).map(([curr, val]) => (
                <div key={curr}>+{val} {curr}</div>
              )) : '0 Points'}
          </div>
          <span className="insight-desc">Based on active multipliers</span>
        </div>
        <div className="insight-card">
          <span className="insight-title">Monthly Focus</span>
          <span className="insight-value">{pieData[0]?.name || 'N/A'}</span>
          <span className="insight-desc">Highest spending category</span>
        </div>
      </motion.div>

      {/* Card Filter */}
      <motion.div className="col-span-full" variants={itemVariants} style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px' }}>
        {uniqueCards.map(card => (
          <button
            key={card}
            onClick={() => setSelectedCard(card)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: `1px solid ${selectedCard === card ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              background: selectedCard === card ? 'var(--accent-light)' : 'var(--surface-color)',
              color: selectedCard === card ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '14px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {card}
          </button>
        ))}
      </motion.div>

      {/* Budget Progress Bars */}
      <motion.div className="col-span-full card" variants={itemVariants} style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Budget Tracking</h3>
        <div className="summary-cards" style={{ gap: '24px' }}>
          {categoryBudgets.filter(c => c.limit > 0).map(cat => (
            <div key={cat.value} onClick={() => setSelectedCategory(cat.value)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{cat.label}</span>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>${cat.spent.toFixed(0)} <span style={{ opacity: 0.5, fontWeight: 400 }}>/ ${cat.limit}</span></span>
              </div>
              <div className="budget-bar-container">
                <div 
                  className="budget-bar-fill" 
                  style={{ 
                    width: `${cat.percentage}%`,
                    background: cat.percentage > 90 ? 'var(--accent-primary)' : (cat.percentage > 70 ? '#f59e0b' : 'var(--success)')
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Header Summary */}
      <motion.div className="col-span-full summary-cards" variants={itemVariants} style={{ marginBottom: '16px' }}>
        <div className="card stat-card glass-panel">
          <span className="stat-title">Total Spent</span>
          <span className="stat-value">${totalSpent.toFixed(2)}</span>
        </div>
        <div className="card stat-card glass-panel">
          <span className="stat-title">Transactions</span>
          <span className="stat-value">{filteredTransactions.length}</span>
        </div>
        <div className="card stat-card glass-panel">
          <span className="stat-title">Top Category</span>
          <span className="stat-value">{pieData[0]?.name || 'N/A'}</span>
        </div>
      </motion.div>

      {/* Charts */}
      <motion.div className="col-span-4 card" variants={itemVariants}>
        <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Spending by Category</h3>
        <SpendingPieChart data={pieData} onCategoryClick={(cat) => setSelectedCategory(prev => prev === cat ? 'All' : cat)} />
      </motion.div>

      <motion.div className="col-span-8 card" variants={itemVariants}>
        <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Recent Trend</h3>
        <SpendingBarChart data={barData} />
      </motion.div>

      {/* Subscription Manager Card */}
      <motion.div className="col-span-4 card" variants={itemVariants}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px' }}>Subscriptions</h3>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>
            ${monthlyBurnRate.toFixed(2)}/mo
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {subList.length > 0 ? subList.map((sub, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                  {getCategoryIcon('Subscriptions')}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{sub.Merchant}</div>
                  <div style={{ fontSize: '11px', opacity: 0.6 }}>Recurring</div>
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>${sub.Amount?.toFixed(2)}</div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '24px', opacity: 0.5, fontSize: '14px' }}>
              No subscriptions found
            </div>
          )}
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div className="col-span-full card" variants={itemVariants} style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px' }}>Transaction History</h3>
        </div>
        
        <div className="transaction-list">
          {filteredTransactions.slice(0, MAX_VISIBLE_TRANSACTIONS).map((t, i) => (
            <TransactionItem 
              key={`${t.Date}-${t.Merchant}-${i}`}
              t={t}
              i={i}
              getCategoryIcon={getCategoryIcon}
              formatDate={formatDate}
              calculateRewards={calculateRewards}
              viewingReceipt={viewingReceipt}
              setViewingReceipt={setViewingReceipt}
              openEditModal={openEditModal}
              handleDelete={handleDelete}
              appConfig={appConfig}
            />
          ))}
        </div>
      </motion.div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTransaction !== null && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
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
                  <input 
                    type="text" 
                    name="Merchant"
                    className="form-input" 
                    value={editFormData.Merchant}
                    onChange={handleEditChange}
                    required 
                  />
                </div>
                
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Amount ($)</label>
                    <input 
                      type="number" 
                      name="Amount"
                      step="0.01" 
                      className="form-input" 
                      value={editFormData.Amount}
                      onChange={handleEditChange}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <div 
                      className="date-display-container form-input" 
                      style={{ position: 'relative' }}
                      onClick={(e) => e.currentTarget.querySelector('input')?.showPicker()}
                    >
                      <span className="date-display-text">{formatDate(editFormData.Date) || 'Select Date'}</span>
                      <input 
                        type="date" 
                        name="Date"
                        className="date-picker-hidden" 
                        value={editFormData.Date}
                        onChange={handleEditChange}
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      name="Category"
                      className="form-input" 
                      value={editFormData.Category}
                      onChange={handleEditChange}
                      required
                    >
                      {appConfig.CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Card</label>
                    <select 
                      name="Card"
                      className="form-input" 
                      value={editFormData.Card}
                      onChange={handleEditChange}
                    >
                      <option value="">Select a Card...</option>
                      {Object.keys(appConfig.CARDS).map(card => (
                        <option key={card} value={card}>{card}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <input 
                    type="text" 
                    name="Notes"
                    className="form-input" 
                    placeholder="Add a note..."
                    value={editFormData.Notes}
                    onChange={handleEditChange}
                  />
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
                      transition: 'all 0.2s ease',
                      backgroundColor: receiptFile ? 'var(--accent-light)' : 'transparent'
                    }}
                  >
                    {receiptFile || editFormData.ReceiptUrl ? <ImageIcon size={20} color="var(--accent-primary)" /> : <Upload size={20} />}
                    <span style={{ fontSize: '15px' }}>
                      {receiptFile ? receiptFile.name : (editFormData.ReceiptUrl ? 'Update existing receipt' : 'Click to upload receipt image')}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
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

      {/* Lightbox Modal */}
      <AnimatePresence>
        {viewingReceipt && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingReceipt(null)}
          >
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
