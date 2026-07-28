import { lazy, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Keyboard } from 'lucide-react';
import AmbientBackground from '@/components/layout/AmbientBackground';
import ErrorBoundary from '@/components/layout/ErrorBoundary';
import PullToRefresh from '@/components/layout/PullToRefresh';
import UserSwitcher from '@/components/layout/UserSwitcher';
import StaggeredMenu from '@/components/layout/StaggeredMenu';
import PageTransition from '@/components/layout/PageTransition';
import { ShortcutsProvider } from '@/accessibility/ShortcutsProvider';
import { useShortcuts } from '@/accessibility/shortcutsContext';
import { UserProvider } from '@/context/UserProvider';
import { DataProvider } from '@/context/DataProvider';
import { ToastProvider } from '@/context/ToastProvider';

const Dashboard = lazy(() => import('@/features/dashboard/DashboardPage'));
const Analytics = lazy(() => import('@/features/analytics/AnalyticsPage'));
const Subscriptions = lazy(() => import('@/features/subscriptions/SubscriptionsPage'));
const AddTransaction = lazy(() => import('@/features/transactions/AddTransactionPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

void import('@/features/dashboard/DashboardPage');
void import('@/features/analytics/AnalyticsPage');
void import('@/features/subscriptions/SubscriptionsPage');
void import('@/features/transactions/AddTransactionPage');
void import('@/features/settings/SettingsPage');

const THEME_KEY = 'app-theme';

const MENU_ITEMS = [
  { label: 'Overview', ariaLabel: 'Go to overview', link: '/' },
  { label: 'Analytics', ariaLabel: 'View spending analytics', link: '/analytics' },
  { label: 'Subscriptions', ariaLabel: 'Manage subscriptions', link: '/subscriptions' },
  { label: 'Add', ariaLabel: 'Add a transaction', link: '/add' },
  { label: 'Settings', ariaLabel: 'Open settings', link: '/settings' },
];

const ShortcutsHelpButton = () => {
  const shortcuts = useShortcuts();
  if (!shortcuts) return null;
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={shortcuts.openHelp}
      aria-label="Keyboard shortcuts"
      title="Keyboard shortcuts (?)"
    >
      <Keyboard size={18} />
    </button>
  );
};

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

const AppShellInner = () => {
  const menuRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const menuColors = useMemo(
    () => (theme === 'dark' ? ['#e09a86', '#7eaea8'] : ['#c4715a', '#5f8a8a']),
    [theme]
  );

  const accentColor = theme === 'dark' ? '#e09a86' : '#c4715a';
  const menuButtonColor = theme === 'dark' ? '#f4f0eb' : '#2a2622';

  return (
    <ShortcutsProvider menuRef={menuRef}>
      <div className="app-root">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AmbientBackground theme={theme} />
        <PullToRefresh />
        <StaggeredMenu
          ref={menuRef}
          isFixed
          position="right"
          items={MENU_ITEMS}
          displaySocials={false}
          displayItemNumbering
          logoUrl="/brand/logo-mark.png"
          colors={menuColors}
          accentColor={accentColor}
          menuButtonColor={menuButtonColor}
          openMenuButtonColor={menuButtonColor}
          changeMenuColorOnOpen={false}
          footer={
            <>
              <UserSwitcher />
              <ShortcutsHelpButton />
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </>
          }
        />
        <div className="app-container">
          <main id="main-content" className="app-main" tabIndex={-1}>
            <ErrorBoundary>
              <Routes>
                <Route element={<PageTransition />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                  <Route path="/add" element={<AddTransaction />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ShortcutsProvider>
  );
};

const AppShell = () => (
  <ErrorBoundary>
    <ToastProvider>
      <UserProvider>
        <DataProvider>
          <Router>
            <AppShellInner />
          </Router>
        </DataProvider>
      </UserProvider>
    </ToastProvider>
  </ErrorBoundary>
);

export default AppShell;
