import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Upload, Image as ImageIcon } from 'lucide-react';
import { saveTransaction, uploadReceipt, fetchConfig } from '../services/storage';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const dt = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const AddTransaction = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    Amount: '',
    Category: 'Food',
    Date: new Date().toISOString().split('T')[0],
    Merchant: '',
    Card: '',
    Notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      const data = await fetchConfig();
      if (data) {
        setConfig(data);
        setFormData(prev => ({ ...prev, Category: data.CATEGORIES[0]?.value || 'Other' }));
      }
      setLoading(false);
    };
    loadConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let receiptUrl = null;
    if (receiptFile) {
      receiptUrl = await uploadReceipt(receiptFile, formData.Date);
    }
    
    const payload = {
      ...formData,
      Amount: parseFloat(formData.Amount) || 0,
      ...(receiptUrl && { ReceiptUrl: receiptUrl })
    };
    
    await saveTransaction(payload);
    
    setIsSubmitting(false);
    setIsSuccess(true);
    
    setTimeout(() => {
      setIsSuccess(false);
      setFormData({
        Amount: '',
        Category: config?.CATEGORIES[0]?.value || 'Food',
        Date: new Date().toISOString().split('T')[0],
        Merchant: '',
        Card: '',
        Notes: '',
      });
      setReceiptFile(null);
    }, 3000);
  };

  if (loading || !config) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}
    >
      <div className="card glass-panel" style={{ padding: '40px' }}>
        <h2 style={{ marginBottom: '32px', fontSize: '24px' }}>Add Transaction</h2>
        
        {isSuccess ? (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '40px 0',
              color: 'var(--success)'
            }}
          >
            <CheckCircle size={64} style={{ marginBottom: '16px' }} />
            <h3 style={{ color: 'var(--text-primary)' }}>Transaction Added!</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Your data has been saved.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Merchant / Description</label>
              <input 
                type="text" 
                name="Merchant"
                className="form-input" 
                placeholder="e.g. Apple Store" 
                value={formData.Merchant}
                onChange={handleChange}
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
                  placeholder="0.00" 
                  value={formData.Amount}
                  onChange={handleChange}
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
                  <span className="date-display-text">{formatDate(formData.Date) || 'Select Date'}</span>
                  <input 
                    type="date" 
                    name="Date"
                    className="date-picker-hidden" 
                    value={formData.Date}
                    onChange={handleChange}
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
                  value={formData.Category}
                  onChange={handleChange}
                  required
                >
                  {config.CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Card</label>
                <select 
                  name="Card"
                  className="form-input" 
                  value={formData.Card}
                  onChange={handleChange}
                >
                  <option value="">Select a Card...</option>
                  {Object.keys(config.CARDS).map(card => (
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
                value={formData.Notes}
                onChange={handleChange}
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
                    color: receiptFile ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                    backgroundColor: receiptFile ? 'var(--accent-light)' : 'transparent'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  {receiptFile ? <ImageIcon size={20} color="var(--accent-primary)" /> : <Upload size={20} />}
                  <span style={{ fontSize: '15px' }}>
                    {receiptFile ? receiptFile.name : 'Click to upload receipt image'}
                  </span>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '16px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (
                <>Save Transaction <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
};

export default AddTransaction;
