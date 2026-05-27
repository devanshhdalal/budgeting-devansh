import { useMemo, useState, useCallback } from 'react';
import { thisMonthRange } from '../utils/date';
import { filterTransactions } from '../utils/filters';

export const useTransactionFilters = (transactions) => {
  const [selectedCard, setSelectedCard] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const setThisMonth = useCallback(() => {
    const { start, end } = thisMonthRange();
    setStartDate(start);
    setEndDate(end);
  }, []);

  const clearDateRange = useCallback(() => {
    setStartDate('');
    setEndDate('');
  }, []);

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(transactions, {
        selectedCard,
        startDate,
        endDate,
        selectedCategory,
        searchQuery,
      }),
    [transactions, selectedCard, startDate, endDate, selectedCategory, searchQuery]
  );

  const uniqueCards = useMemo(
    () => ['All', ...new Set(transactions.map((t) => t.Card).filter(Boolean))],
    [transactions]
  );

  return {
    selectedCard,
    setSelectedCard,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    setThisMonth,
    clearDateRange,
    filteredTransactions,
    uniqueCards,
  };
};
