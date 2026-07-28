import { useMemo, useState, useCallback } from 'react';
import { thisMonthRange } from '../utils/date';
import { filterTransactions } from '../utils/filters';
import { canonicalizeCardName } from '@shared/cardNames';

export const useTransactionFilters = (transactions, config) => {
  const [selectedCard, setSelectedCard] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);

  const needsReviewCount = useMemo(
    () => transactions.filter((t) => !t.IsTest && t.Merchant === 'Needs review').length,
    [transactions]
  );

  const setThisMonth = useCallback(() => {
    const { start, end } = thisMonthRange();
    setStartDate(start);
    setEndDate(end);
  }, []);

  const clearDateRange = useCallback(() => {
    setStartDate('');
    setEndDate('');
  }, []);

  const isThisMonth = useMemo(() => {
    const { start, end } = thisMonthRange();
    return startDate === start && endDate === end;
  }, [startDate, endDate]);

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(transactions, {
        selectedCard,
        startDate,
        endDate,
        selectedCategory,
        searchQuery,
        needsReviewOnly,
      }),
    [transactions, selectedCard, startDate, endDate, selectedCategory, searchQuery, needsReviewOnly]
  );

  const uniqueCards = useMemo(() => {
    const fromConfig = Object.keys(config?.CARDS ?? {});
    const fromTx = transactions.map((t) => canonicalizeCardName(t.Card)).filter(Boolean);
    return ['All', ...new Set([...fromConfig, ...fromTx])];
  }, [transactions, config]);

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
    needsReviewOnly,
    setNeedsReviewOnly,
    needsReviewCount,
    setThisMonth,
    clearDateRange,
    isThisMonth,
    filteredTransactions,
    uniqueCards,
  };
};
