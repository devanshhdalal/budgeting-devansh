import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isModKey } from './modKey';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { ShortcutsContext } from './shortcutsContext';

const isTypingTarget = (target) => {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
};

const isCoarsePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export const ShortcutsProvider = ({ children, menuRef }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpOpenRef = useRef(helpOpen);

  useEffect(() => {
    helpOpenRef.current = helpOpen;
  }, [helpOpen]);

  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  const focusDashboardSearch = useCallback(() => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => document.getElementById('dashboard-search')?.focus(), 100);
      return;
    }
    document.getElementById('dashboard-search')?.focus();
  }, [location.pathname, navigate]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (helpOpenRef.current) {
          e.preventDefault();
          closeHelp();
          return;
        }
        if (menuRef?.current?.isOpen?.()) {
          e.preventDefault();
          menuRef.current.close();
        }
        return;
      }

      if (isTypingTarget(e.target)) return;

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        if (isCoarsePointer()) return;
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      if (e.key === '/' && !e.shiftKey) {
        if (isCoarsePointer()) return;
        e.preventDefault();
        focusDashboardSearch();
        return;
      }

      if (!isModKey(e)) return;

      const key = e.key.toLowerCase();
      if (key === 'm') {
        e.preventDefault();
        menuRef?.current?.toggle();
        return;
      }
      if (key === '1') {
        e.preventDefault();
        navigate('/');
        return;
      }
      if (key === '2') {
        e.preventDefault();
        navigate('/subscriptions');
        return;
      }
      if (key === '3') {
        e.preventDefault();
        navigate('/add');
        return;
      }
      if (key === '4') {
        e.preventDefault();
        navigate('/settings');
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeHelp, focusDashboardSearch, menuRef, navigate]);

  const value = useMemo(() => ({ openHelp, closeHelp }), [openHelp, closeHelp]);

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <KeyboardShortcutsModal open={helpOpen} onClose={closeHelp} />
    </ShortcutsContext.Provider>
  );
};
