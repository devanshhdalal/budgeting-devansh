export const matchesDateRange = (transactionDate, startDate, endDate) => {
  if (!transactionDate) return !startDate && !endDate;
  if (startDate && transactionDate < startDate) return false;
  if (endDate && transactionDate > endDate) return false;
  return true;
};

export const filterTransactions = (transactions, { selectedCard, startDate, endDate, selectedCategory, searchQuery }) => {
  const query = searchQuery.toLowerCase();
  return transactions.filter((t) => {
    if (selectedCard !== 'All' && t.Card !== selectedCard) return false;
    if (!matchesDateRange(t.Date, startDate, endDate)) return false;
    if (selectedCategory !== 'All' && t.Category !== selectedCategory) return false;
    if (
      query &&
      !t.Merchant?.toLowerCase().includes(query) &&
      !t.Category?.toLowerCase().includes(query) &&
      !t.Notes?.toLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  });
};
