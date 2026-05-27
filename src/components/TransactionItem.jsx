import { memo } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Receipt } from 'lucide-react';
import { CategoryIcon } from '../utils/categoryIcons';
import { formatDisplayDate } from '../utils/date';
import { formatCurrency } from '../utils/format';
import { calculateRewards } from '../config/rewards';

const TransactionItem = memo(({
  transaction,
  index,
  appConfig,
  onEdit,
  onDelete,
  onViewReceipt,
}) => {
  const rewards = calculateRewards(
    transaction.Card,
    transaction.Category,
    transaction.Amount,
    transaction.Merchant,
    appConfig.CARDS,
    appConfig.MERCHANT_REWARDS_OVERRIDES
  );

  return (
    <motion.div
      className="transaction-item"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="transaction-icon">
          <CategoryIcon category={transaction.Category} categories={appConfig.CATEGORIES} />
        </div>
        <div className="transaction-details">
          <div className="transaction-merchant">{transaction.Merchant || 'Unknown Merchant'}</div>
          <div className="transaction-category">
            {transaction.Category || 'Other'}
            {transaction.Notes && (
              <span style={{ marginLeft: '8px', opacity: 0.7 }}>— {transaction.Notes}</span>
            )}
          </div>
          <div className="transaction-date">{formatDisplayDate(transaction.Date)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="transaction-actions">
          {transaction.ReceiptUrl && (
            <button
              className="action-btn"
              onClick={() => onViewReceipt(transaction.ReceiptUrl)}
              title="View Receipt"
            >
              <Receipt size={18} />
            </button>
          )}
          <button className="action-btn" onClick={() => onEdit(transaction)} title="Edit Transaction">
            <Pencil size={18} />
          </button>
          <button
            className="action-btn"
            onClick={() => onDelete(transaction)}
            title="Delete Transaction"
            style={{ color: 'var(--accent-primary)' }}
          >
            <Trash2 size={18} />
          </button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="transaction-amount">{formatCurrency(transaction.Amount)}</div>
          {rewards && (
            <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>
              +{rewards.points} {rewards.currency}
              {rewards.note && (
                <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 400, marginTop: '2px' }}>
                  {rewards.note}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

TransactionItem.displayName = 'TransactionItem';

export default TransactionItem;
