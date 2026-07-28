import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { resolveBillingRange } from '@shared/billingCycle';
import { thisMonthRange } from '@/utils/date';
import { filterTransactions } from '@/utils/filters';

const parseParams = (searchParams, config) => {
  const card = searchParams.get('card') || 'All';
  const category = searchParams.get('category') || 'All';
  let start = searchParams.get('start') || '';
  let end = searchParams.get('end') || '';

  if (!start && !end) {
    if (card && card !== 'All') {
      const range = resolveBillingRange(card, new Date(), config?.BILLING_CYCLES ?? {});
      start = range.start;
      end = range.end;
    } else {
      const month = thisMonthRange();
      start = month.start;
      end = month.end;
    }
  }

  return { card, category, start, end, search: searchParams.get('search') || '' };
};

export const useAnalyticsFilters = (transactions, config) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => parseParams(searchParams, config),
    [searchParams, config]
  );

  const setFilter = useCallback(
    (key, value) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === 'All' || value === '') next.delete(key);
        else next.set(key, value);
        if (key === 'card' && (value === 'All' || !value)) {
          if (!prev.get('start') && !prev.get('end')) {
            next.delete('start');
            next.delete('end');
          }
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const setDateRange = useCallback(
    (start, end) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (start) next.set('start', start);
        else next.delete('start');
        if (end) next.set('end', end);
        else next.delete('end');
        return next;
      });
    },
    [setSearchParams]
  );

  const setThisMonth = useCallback(() => {
    const { start, end } = thisMonthRange();
    setDateRange(start, end);
  }, [setDateRange]);

  const applyBillingCycle = useCallback(
    (cardName) => {
      if (!cardName || cardName === 'All') {
        setThisMonth();
        return;
      }
      const range = resolveBillingRange(cardName, new Date(), config?.BILLING_CYCLES ?? {});
      setDateRange(range.start, range.end);
    },
    [config, setDateRange, setThisMonth]
  );

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(transactions, {
        selectedCard: filters.card,
        startDate: filters.start,
        endDate: filters.end,
        selectedCategory: filters.category,
        searchQuery: filters.search,
        needsReviewOnly: false,
      }),
    [transactions, filters]
  );

  const uniqueCards = useMemo(
    () => ['All', ...new Set(transactions.map((t) => t.Card).filter(Boolean))],
    [transactions]
  );

  const buildAnalyticsLink = useCallback(
    (overrides = {}) => {
      const params = new URLSearchParams();
      const merged = { ...filters, ...overrides };
      if (merged.card && merged.card !== 'All') params.set('card', merged.card);
      if (merged.category && merged.category !== 'All') params.set('category', merged.category);
      if (merged.start) params.set('start', merged.start);
      if (merged.end) params.set('end', merged.end);
      if (merged.search) params.set('search', merged.search);
      const qs = params.toString();
      return qs ? `/analytics?${qs}` : '/analytics';
    },
    [filters]
  );

  return {
    ...filters,
    selectedCard: filters.card,
    selectedCategory: filters.category,
    startDate: filters.start,
    endDate: filters.end,
    searchQuery: filters.search,
    setSelectedCard: (v) => {
      setFilter('card', v);
      if (v && v !== 'All') applyBillingCycle(v);
    },
    setSelectedCategory: (v) => setFilter('category', v),
    setStartDate: (v) => setDateRange(v, filters.end),
    setEndDate: (v) => setDateRange(filters.start, v),
    setSearchQuery: (v) => setFilter('search', v),
    setThisMonth,
    setDateRange,
    filteredTransactions,
    uniqueCards,
    buildAnalyticsLink,
  };
};

export default useAnalyticsFilters;
