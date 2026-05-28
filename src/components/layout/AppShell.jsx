import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Plus, Settings, Sun, Moon } from 'lucide-react';
import AmbientBackground from './AmbientBackground';
import LoadingScreen from './LoadingScreen';
import ErrorBoundary from './ErrorBoundary';
import PullToRefresh from './PullToRefresh';
import UserSwitcher from '../UserSwitcher';
import { UserProvider } from '../../context/UserProvider';
import { DataProvider } from '../../context/DataProvider';
import { ToastProvider } from '../../context/ToastProvider';
import { pageEnter } from '../../motion/presets';

const Dashboard = lazy(() => import('../../pages/Dashboard'));
const AddTransaction = lazy(() => import('../../pages/AddTransaction'));
const SettingsPage = lazy(() => import('../../pages/Settings'));

const THEME_KEY = 'app-theme';

const PageTransition = ({ children }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} className="page-wrap" {...pageEnter}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

const NavItem = ({ to, icon: Icon, label, end }) => (
  <NavLink to={to} end={end} className={({ isActive }) => `nav-pill ${isActive ? 'active' : ''}`}>
    <Icon size={18} strokeWidth={2} />
    <span>{label}</span>
  </NavLink>
);

const MainNav = () => (
  <nav className="main-nav" aria-label="Main">
    <NavItem to="/" end icon={LayoutDashboard} label="Overview" />
    <NavItem to="/add" icon={Plus} label="Add" />
    <NavItem to="/settings" icon={Settings} label="Settings" />
  </nav>
);

const MobileNav = () => (
  <nav className="mobile-nav" aria-label="Mobile">
    <NavLink to="/" end className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
      <LayoutDashboard size={22} />
      <span>Home</span>
    </NavLink>
    <NavLink to="/add" className={({ isActive }) => `mobile-nav-item mobile-nav-add ${isActive ? 'active' : ''}`}>
      <Plus size={24} />
    </NavLink>
    <NavLink to="/settings" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
      <Settings size={22} />
      <span>Settings</span>
    </NavLink>
  </nav>
);

const ThemeToggle = ({ theme, onToggle }) => (
  <button type="button" className="icon-btn" onClick={onToggle} aria-label="Toggle theme">
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.2 }}
        className="icon-btn-inner"
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </motion.span>
    </AnimatePresence>
  </button>
);

const Header = ({ theme, onThemeToggle }) => (
  <header className="app-header">
    <div className="brand">
      <motion.div
        className="brand-mark"
        whileHover={{ scale: 1.05, rotate: -4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        <span className="brand-mark-inner" aria-hidden />
      </motion.div>
      <div className="brand-text">
        <span className="brand-name">BudgetPro</span>
        <span className="brand-tagline">Personal finance</span>
      </div>
    </div>
    <div className="header-tools">
      <UserSwitcher />
      <div className="header-nav-desktop">
        <MainNav />
      </div>
      <ThemeToggle theme={theme} onToggle={onThemeToggle} />
    </div>
  </header>
);

const AppShell = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <ErrorBoundary>
      <ToastProvider>
        <UserProvider>
          <DataProvider>
            <Router>
              <div className="app-root">
                <AmbientBackground />
                <PullToRefresh />
                <div className="app-container">
                  <Header theme={theme} onThemeToggle={toggleTheme} />
                  <main className="app-main">
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingScreen />}>
                        <PageTransition>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/add" element={<AddTransaction />} />
                            <Route path="/settings" element={<SettingsPage />} />
                          </Routes>
                        </PageTransition>
                      </Suspense>
                    </ErrorBoundary>
                  </main>
                </div>
                <MobileNav />
              </div>
            </Router>
          </DataProvider>
        </UserProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default AppShell;
