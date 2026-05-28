import { memo } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Receipt } from 'lucide-react';
import { CategoryIcon } from '../utils/categoryIcons';
import { formatDisplayDate } from '../utils/date';
import { formatCurrency } from '../utils/format';
import { calculateRewards } from '../config/rewards';

const TransactionItem = memo(({ transaction, index, appConfig, onEdit, onDelete, onViewReceipt }) => {
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25) }}
    >
      <div className="transaction-left">
        <div className="transaction-icon">
          <CategoryIcon category={transaction.Category} categories={appConfig.CATEGORIES} />
        </div>
        <div>
          <div className="transaction-merchant">{transaction.Merchant || 'Unknown'}</div>
          <div className="transaction-meta">
            {transaction.Category || 'Other'}
            {transaction.Notes && (
              <span className="transaction-note"> · {transaction.Notes}</span>
            )}
          </div>
          <div className="transaction-date">{formatDisplayDate(transaction.Date)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="transaction-actions">
          {transaction.ReceiptUrl && (
            <button type="button" className="action-btn" onClick={() => onViewReceipt(transaction.ReceiptUrl)} title="View receipt">
              <Receipt size={17} />
            </button>
          )}
          <button type="button" className="action-btn" onClick={() => onEdit(transaction)} title="Edit">
            <Pencil size={17} />
          </button>
          <button type="button" className="action-btn action-btn-danger" onClick={() => onDelete(transaction)} title="Delete">
            <Trash2 size={17} />
          </button>
        </div>
        <div className="transaction-right">
          <div className="transaction-amount">{formatCurrency(transaction.Amount)}</div>
          {rewards && (
            <div className="transaction-reward">
              +{rewards.points} {rewards.currency}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

TransactionItem.displayName = 'TransactionItem';

export default TransactionItem;
