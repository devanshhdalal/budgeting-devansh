import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, CreditCard, PieChart, DollarSign, Settings as SettingsIcon } from 'lucide-react';
import { fetchConfig, saveConfig } from '../services/storage';

const Settings = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadConfig = async () => {
      const data = await fetchConfig();
      if (data) setConfig(data);
      setLoading(false);
    };
    loadConfig();
  }, []);

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

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading Settings...</div>;
  if (!config) return <div style={{ textAlign: 'center', padding: '100px' }}>Failed to load configuration.</div>;

  return (
    <div className="settings-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingTop: '20px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em' }}>Preferences</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Customize your budgets and connected accounts</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={18} /> Save Changes
        </button>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            padding: '16px 20px', 
            borderRadius: '16px', 
            background: message.includes('success') ? 'var(--success-light)' : 'var(--accent-light)', 
            color: message.includes('success') ? 'var(--success)' : 'var(--accent-primary)', 
            marginBottom: '32px', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: `1px solid ${message.includes('success') ? 'var(--success)' : 'var(--accent-primary)'}22`
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: message.includes('success') ? 'var(--success)' : 'var(--accent-primary)' }} />
          {message}
        </motion.div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Budget Management */}
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 700 }}>Monthly Budgets</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Set spending limits for each category</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '32px' }}>
            {config.CATEGORIES.map(cat => (
              <div key={cat.value} className="budget-settings-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{cat.label}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '16px' }}>
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
                    cursor: 'pointer'
                  }}
                  value={config.BUDGET_CONFIG[cat.value] || 0}
                  onChange={(e) => updateBudget(cat.value, e.target.value)}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Card Management */}
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
              <CreditCard size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 700 }}>Payment Methods</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Manage your credit and debit cards</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {Object.entries(config.CARDS).map(([name, data]) => (
              <div key={name} style={{ 
                padding: '20px', 
                borderRadius: '20px', 
                background: 'var(--bg-color)', 
                border: '1px solid var(--border-color)', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-primary)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{data.currency} Card</div>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', background: 'var(--success-light)', color: 'var(--success)' }}>
                    ACTIVE
                  </div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SettingsIcon size={14} /> Tap to configure rewards
                </div>
              </div>
            ))}
            
            <button 
              className="add-card-btn"
              style={{ 
                border: '2px dashed var(--border-color)', 
                borderRadius: '20px', 
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => alert('New card addition is coming in the next update!')}
            >
              <Plus size={24} />
              <span style={{ fontWeight: 600 }}>Link New Account</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
