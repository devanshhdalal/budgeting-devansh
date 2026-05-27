import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Plus, Trash2, CreditCard, DollarSign, X } from 'lucide-react';
import { saveConfig } from '../services/storage';
import { useConfig } from '../hooks/useConfig';

const Settings = () => {
  const { config, setConfig, loading } = useConfig();
  const [message, setMessage] = useState('');
  const [editingCard, setEditingCard] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleSave = async () => {
    setMessage('Saving...');
    const success = await saveConfig(config);
    if (success) {
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Failed to save settings.');
    }
  };

  const updateBudget = (category, value) => {
    setConfig(prev => ({
      ...prev,
      BUDGET_CONFIG: {
        ...prev.BUDGET_CONFIG,
        [category]: parseFloat(value) || 0
      }
    }));
  };

  const openCardEditor = (name, data) => {
    setEditingCard({ name, ...data });
    setIsAddingNew(false);
  };

  const openNewCardEditor = () => {
    const defaultMultipliers = {};
    config.CATEGORIES.forEach(cat => { defaultMultipliers[cat.value] = 1; });
    defaultMultipliers['Base'] = 1;

    setEditingCard({
      name: '',
      currency: 'Points',
      multipliers: defaultMultipliers
    });
    setIsAddingNew(true);
  };

  const saveCardChanges = () => {
    const newCards = { ...config.CARDS };
    
    if (isAddingNew) {
      if (!editingCard.name) return alert('Card name is required');
      newCards[editingCard.name] = {
        currency: editingCard.currency,
        multipliers: editingCard.multipliers
      };
    } else {
      // If name changed, we need to delete old key
      const oldName = Object.keys(config.CARDS).find(k => k === editingCard.name) || editingCard.name;
      delete newCards[oldName];
      newCards[editingCard.name] = {
        currency: editingCard.currency,
        multipliers: editingCard.multipliers
      };
    }

    setConfig(prev => ({ ...prev, CARDS: newCards }));
    setEditingCard(null);
  };

  const deleteCard = (name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      const newCards = { ...config.CARDS };
      delete newCards[name];
      setConfig(prev => ({ ...prev, CARDS: newCards }));
      setEditingCard(null);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading Settings...</div>;
  if (!config) return <div style={{ textAlign: 'center', padding: '100px' }}>Failed to load configuration.</div>;

  return (
    <div className="settings-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 12px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', paddingTop: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em' }}>Preferences</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>Customize your budgets and accounts</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} style={{ padding: '10px 16px' }}>
          <Save size={18} /> <span className="hide-mobile">Save Changes</span>
        </button>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ 
              padding: '16px', 
              borderRadius: '16px', 
              background: message.includes('success') ? 'var(--success-light)' : 'var(--accent-light)', 
              color: message.includes('success') ? 'var(--success)' : 'var(--accent-primary)', 
              marginBottom: '24px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: `1px solid ${message.includes('success') ? 'var(--success)' : 'var(--accent-primary)'}22`,
              fontSize: '14px'
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: message.includes('success') ? 'var(--success)' : 'var(--accent-primary)' }} />
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Budget Management */}
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '24px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Monthly Budgets</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Set spending limits</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
            {config.CATEGORIES.map(cat => (
              <div key={cat.value} className="budget-settings-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{cat.label}</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '15px' }}>
                    ${config.BUDGET_CONFIG[cat.value] || 0}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="3000" 
                  step="50"
                  style={{ 
                    width: '100%', 
                    height: '6px',
                    borderRadius: '3px',
                    accentColor: 'var(--accent-primary)',
                    cursor: 'pointer',
                    display: 'block'
                  }}
                  value={config.BUDGET_CONFIG[cat.value] || 0}
                  onChange={(e) => updateBudget(cat.value, e.target.value)}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Card Management */}
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ padding: '24px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Payment Methods</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Manage accounts and multipliers</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {Object.entries(config.CARDS).map(([name, data]) => (
              <div key={name} 
                onClick={() => openCardEditor(name, data)}
                style={{ 
                  padding: '16px', 
                  borderRadius: '16px', 
                  background: 'var(--bg-color)', 
                  border: '1px solid var(--border-color)', 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-primary)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{data.currency}</div>
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--success-light)', color: 'var(--success)' }}>
                    ACTIVE
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              className="add-card-btn"
              style={{ 
                border: '2px dashed var(--border-color)', 
                borderRadius: '16px', 
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '60px'
              }}
              onClick={openNewCardEditor}
            >
              <Plus size={20} />
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Add Account</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Card Edit Modal */}
      <AnimatePresence>
        {editingCard && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: '500px', width: '95%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{isAddingNew ? 'Add New Card' : 'Edit Card'}</h2>
                <button onClick={() => setEditingCard(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Card Name</label>
                <input 
                  className="form-input"
                  value={editingCard.name}
                  onChange={(e) => setEditingCard({ ...editingCard, name: e.target.value })}
                  placeholder="e.g. AMEX Cobalt"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reward Currency</label>
                <input 
                  className="form-input"
                  value={editingCard.currency}
                  onChange={(e) => setEditingCard({ ...editingCard, currency: e.target.value })}
                  placeholder="e.g. Points, Cashback, Scene+"
                />
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '24px 0 16px' }}>Multipliers</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {Object.keys(editingCard.multipliers).map(key => (
                  <div key={key} className="form-group" style={{ marginBottom: '8px' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>{key}</label>
                    <input 
                      type="number"
                      step="0.01"
                      className="form-input"
                      style={{ padding: '8px' }}
                      value={editingCard.multipliers[key]}
                      onChange={(e) => setEditingCard({
                        ...editingCard,
                        multipliers: {
                          ...editingCard.multipliers,
                          [key]: parseFloat(e.target.value) || 0
                        }
                      })}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                {!isAddingNew && (
                  <button className="btn btn-secondary" style={{ color: 'var(--accent-primary)', flex: 1 }} onClick={() => deleteCard(editingCard.name)}>
                    <Trash2 size={18} /> Delete
                  </button>
                )}
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveCardChanges}>
                  <Save size={18} /> {isAddingNew ? 'Add Card' : 'Update Card'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
