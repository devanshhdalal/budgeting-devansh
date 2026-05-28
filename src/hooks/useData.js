import { useContext } from 'react';
import { DataContext } from '../context/dataContext';

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
