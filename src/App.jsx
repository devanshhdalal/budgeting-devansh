import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, PlusCircle, LayoutDashboard, Moon, Sun } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import AddTransaction from './pages/AddTransaction';
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
    </nav>
  );
}

function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Toggle Dark Mode"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </header>

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<AddTransaction />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
