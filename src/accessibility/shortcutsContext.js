import { createContext, useContext } from 'react';

export const ShortcutsContext = createContext(null);

export const useShortcuts = () => useContext(ShortcutsContext);
