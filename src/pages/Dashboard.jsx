import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Coffee, Car, HeartPulse, Home, MoreHorizontal, Pencil, X, Save, Trash2, Search, Receipt, Upload, Image as ImageIcon } from 'lucide-react';
import { fetchTransactions, saveTransaction, deleteTransaction, uploadReceipt } from '../services/storage';
import { SpendingPieChart, SpendingBarChart } from '../components/Charts';
import { calculateRewards } from '../config/rewards';
import { CARDS, CATEGORIES, BUDGET_CONFIG } from '../config/cards';

// Category Icon mapping
const getCategoryIcon = (category) => {
  switch (category?.toLowerCase()) {
    case 'food':
    case 'groceries':
      return <Coffee size={24} />;
    case 'car':
      return <Car size={24} />;
    case 'health':
      return <HeartPulse size={24} />;
    case 'utilities':
      return <Home size={24} />;
    case 'personal items':
      return <ShoppingBag size={24} />;
    default:
      return <MoreHorizontal size={24} />;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Get time values with timezone offset adjustment to prevent off-by-one day errors
  const dt = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit Modal State
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Viewer State
  const [viewingReceipt, setViewingReceipt] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchTransactions();
      setTransactions(data);
      setLoading(false);
    };
    loadData();
  }, []);

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
      const newUrl = await uploadReceipt(receiptFile, editFormData.Date);
      if (newUrl) receiptUrl = newUrl;
    }
    
    const updatedData = {
      ...transactions[editingTransaction],
      ...editFormData,
      Amount: parseFloat(editFormData.Amount) || 0,
      ReceiptUrl: receiptUrl
    };
    
    // Update local state
    const newTransactions = [...transactions];
    newTransactions[editingTransaction] = updatedData;
    setTransactions(newTransactions);
    
    const payload = { ...updatedData, _index: editingTransaction };
    await saveTransaction(payload);
    
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

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading...</div>;
  }

  const uniqueCards = ['All', ...new Set(transactions.map(t => t.Card).filter(Boolean))];
  
  const uniqueMonths = ['All', ...new Set(transactions.map(t => {
    if (!t.Date) return null;
    return t.Date.substring(0, 7); // YYYY-MM
  }).filter(Boolean))].sort((a,b) => b.localeCompare(a)); // Descending

  const transactionsWithIndex = transactions.map((t, index) => ({ ...t, originalIndex: index }));
  
  const filteredTransactions = transactionsWithIndex.filter(t => {
    const matchCard = selectedCard === 'All' || t.Card === selectedCard;
    const matchMonth = selectedMonth === 'All' || (t.Date && t.Date.startsWith(selectedMonth));
    const query = searchQuery.toLowerCase();
    const matchSearch = query === '' || 
      (t.Merchant && t.Merchant.toLowerCase().includes(query)) ||
      (t.Category && t.Category.toLowerCase().includes(query)) ||
      (t.Notes && t.Notes.toLowerCase().includes(query));
    
    return matchCard && matchMonth && matchSearch;
  });

  // Calculate summary stats
  const totalSpent = filteredTransactions.reduce((sum, t) => sum + (t.Amount || 0), 0);
  
  // Group by category for Pie Chart
  const categoryMap = {};
  filteredTransactions.forEach(t => {
    const cat = t.Category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + (t.Amount || 0);
  });
  const pieData = Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] })).sort((a,b) => b.value - a.value);

  // Group by date for Bar Chart
  const dateMap = {};
  filteredTransactions.forEach(t => {
    if(!t.Date) return;
    const dateStr = new Date(t.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dateMap[dateStr] = (dateMap[dateStr] || 0) + (t.Amount || 0);
  });
  const barData = Object.keys(dateMap)
    .sort((a,b) => new Date(a) - new Date(b))
    .slice(-10)
    .map(key => ({ name: key, amount: dateMap[key] }));

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
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
        <select 
          className="form-input" 
          style={{ width: 'auto', borderRadius: '24px', padding: '10px 16px' }}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {uniqueMonths.map(m => (
            <option key={m} value={m}>{m === 'All' ? 'All Months' : new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>
          ))}
        </select>
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
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {card}
          </button>
        ))}
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

      {/* Budgets */}
      {selectedMonth !== 'All' && (
        <motion.div className="col-span-full card" variants={itemVariants} style={{ marginBottom: '8px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Monthly Budgets</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {Object.keys(BUDGET_CONFIG).map(cat => {
              const spent = categoryMap[cat] || 0;
              const limit = BUDGET_CONFIG[cat];
              const percent = Math.min((spent / limit) * 100, 100);
              const isOver = spent > limit;
              
              if (spent === 0 && !isOver) return null; // Only show active budgets
              
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                    <span>{cat}</span>
                    <span style={{ color: isOver ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                      ${spent.toFixed(2)} / ${limit}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', background: isOver ? 'var(--accent-primary)' : 'var(--success)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <motion.div className="col-span-4 card" variants={itemVariants}>
        <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Spending by Category</h3>
        <SpendingPieChart data={pieData} />
      </motion.div>

      <motion.div className="col-span-8 card" variants={itemVariants}>
        <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Recent Trend</h3>
        <SpendingBarChart data={barData} />
      </motion.div>

      {/* Transaction History */}
      <motion.div className="col-span-full card" variants={itemVariants} style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px' }}>Transaction History</h3>
        </div>
        
        <div className="transaction-list">
          {filteredTransactions.slice(0, 15).map((t, i) => {
            const rewards = calculateRewards(t.Card, t.Category, t.Amount);
            return (
            <motion.div 
              key={i} 
              className="transaction-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
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
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
            );
          })}
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
                    <input 
                      type="date" 
                      name="Date"
                      className="form-input" 
                      value={editFormData.Date}
                      onChange={handleEditChange}
                      required 
                    />
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
                      {CATEGORIES.map(cat => (
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
                      {Object.keys(CARDS).map(card => (
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
