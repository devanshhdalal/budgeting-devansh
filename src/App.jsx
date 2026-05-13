import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, PlusCircle, LayoutDashboard, Moon, Sun } from 'lucide-react';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AddTransaction = React.lazy(() => import('./pages/AddTransaction'));
const Settings = React.lazy(() => import('./pages/Settings'));
import './index.css';

function NavLinks() {
  const location = useLocation();
  
  return (
    <nav className="nav-menu">
      <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
        Dashboard
      </Link>
      <Link to="/add" className={`nav-link ${location.pathname === '/add' ? 'active' : ''}`}>
        Add Transaction
      </Link>
      <Link to="/settings" className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>
        Settings
      </Link>
    </nav>
  );
}

function App() {
  // Default to dark theme, but check localStorage for saved preference
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <Wallet color="var(--accent-primary)" size={32} />
            <span>Budget<span className="text-gradient">Pro</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <NavLinks />
            <button 
              onClick={toggleTheme} 
              className="theme-toggle"
              title="Toggle Dark Mode"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </header>

        <main style={{ flex: 1 }}>
          <React.Suspense fallback={<div className="glass-panel" style={{ margin: '40px', padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading premium experience...</div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add" element={<AddTransaction />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </React.Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;
