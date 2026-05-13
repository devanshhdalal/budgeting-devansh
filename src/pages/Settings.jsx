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
    <div className="settings-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>App Settings</h1>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={18} /> Save All Changes
        </button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '12px', background: message.includes('success') ? 'var(--success-light)' : 'var(--accent-light)', color: message.includes('success') ? 'var(--success)' : 'var(--accent-primary)', marginBottom: '24px', fontWeight: 600 }}>
          {message}
        </div>
      )}

      <div className="dashboard-grid">
        {/* Budget Management */}
        <motion.div className="col-span-6 card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <DollarSign size={24} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '20px' }}>Monthly Budgets</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {config.CATEGORIES.map(cat => (
              <div key={cat.value} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {cat.label}
                  <span>${config.BUDGET_CONFIG[cat.value] || 0}</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="2000" 
                  step="10"
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                  value={config.BUDGET_CONFIG[cat.value] || 0}
                  onChange={(e) => updateBudget(cat.value, e.target.value)}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Card Management (Simple View) */}
        <motion.div className="col-span-6 card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <CreditCard size={24} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '20px' }}>Active Cards</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(config.CARDS).map(([name, data]) => (
              <div key={name} style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>{data.currency}</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)' }}>
                  Active
                </div>
              </div>
            ))}
            <button className="btn btn-secondary-sm" style={{ marginTop: '12px', width: '100%' }} onClick={() => alert('Card editing coming soon in advanced mode!')}>
              <Plus size={16} /> Add New Card
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
