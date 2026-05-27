/** Format dollar amounts for display, e.g. "$17.24". */
export const formatCurrency = (amount) => {
  const value = Number(amount);
  if (Number.isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
