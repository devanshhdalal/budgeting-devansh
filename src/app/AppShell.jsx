import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Keyboard } from 'lucide-react';
import AmbientBackground from '@/components/layout/AmbientBackground';
import LoadingScreen from '@/components/layout/LoadingScreen';
import ErrorBoundary from '@/components/layout/ErrorBoundary';
import PullToRefresh from '@/components/layout/PullToRefresh';
import UserSwitcher from '@/components/layout/UserSwitcher';
import StaggeredMenu from '@/components/layout/StaggeredMenu';
import { ShortcutsProvider } from '@/accessibility/ShortcutsProvider';
import { useShortcuts } from '@/accessibility/shortcutsContext';
import { UserProvider } from '@/context/UserProvider';
import { DataProvider } from '@/context/DataProvider';
import { ToastProvider } from '@/context/ToastProvider';
import { pageEnter } from '@/motion/presets';

const Dashboard = lazy(() => import('@/features/dashboard/DashboardPage'));
const Subscriptions = lazy(() => import('@/features/subscriptions/SubscriptionsPage'));
const AddTransaction = lazy(() => import('@/features/transactions/AddTransactionPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

const THEME_KEY = 'app-theme';

const MENU_ITEMS = [
  { label: 'Overview', ariaLabel: 'Go to overview', link: '/' },
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
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const menuColors = useMemo(
    () => (theme === 'dark' ? ['#e8a090', '#a78bfa'] : ['#c45c4a', '#8b6fd4']),
    [theme]
  );

  const accentColor = theme === 'dark' ? '#e8a090' : '#c45c4a';
  const menuButtonColor = theme === 'dark' ? '#f4f4f6' : '#1a1a1f';

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
          logoUrl="/favicon.svg"
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
              <Suspense fallback={<LoadingScreen />}>
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/subscriptions" element={<Subscriptions />} />
                    <Route path="/add" element={<AddTransaction />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </PageTransition>
              </Suspense>
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
