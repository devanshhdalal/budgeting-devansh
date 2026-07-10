/** Parse AMEX Canada wallet/notification text. Tune regex against real captures. */
export const parseAmex = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) return null;

  const amountMatch = text.match(/(?:CAD|\$)\s*([\d,]+\.?\d*)/i) || text.match(/([\d,]+\.\d{2})/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
  if (!amount || Number.isNaN(amount)) return null;

  const isRefund = /refund|credit|reversal|returned/i.test(text);
  const cardLast4 = text.match(/\*{0,2}(\d{4})\b/)?.[1] || text.match(/ending\s+(\d{4})/i)?.[1];

  const merchantMatch =
    text.match(/at\s+(.+?)(?:\s+on|\s+for|\s+CAD|\s+\$|$)/i) ||
    text.match(/purchase\s+(?:at|from)\s+(.+?)(?:\s+on|$)/i);
  const merchant = merchantMatch?.[1]?.trim() || 'Unknown merchant';

  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/) || text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

  const foreignMatch = text.match(/USD\s*([\d,]+\.?\d*)/i);
  const foreignAmount = foreignMatch ? parseFloat(foreignMatch[1].replace(/,/g, '')) : null;

  return {
    amount,
    merchant,
    date,
    cardLast4,
    isRefund,
    currency: 'CAD',
    foreignAmount,
    foreignCurrency: foreignAmount ? 'USD' : null,
  };
};
