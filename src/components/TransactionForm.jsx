import { Upload, Image as ImageIcon } from 'lucide-react';
import DateField from './DateField';

const TransactionForm = ({
  formData,
  onChange,
  onFileChange,
  receiptFile,
  config,
  showReceipt = true,
  showRefund = false,
  showForeign = false,
  isRefund = false,
  onRefundToggle,
  foreignAmount = '',
  foreignCurrency = '',
  onForeignChange,
}) => {
  const cardOptions = Object.keys(config?.CARDS ?? {});

  return (
    <>
      <div className="form-group">
        <label className="form-label">Merchant</label>
        <input
          type="text"
          name="Merchant"
          className="form-input"
          placeholder="Where did you spend?"
          value={formData.Merchant}
          onChange={onChange}
          required
        />
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Amount (CAD)</label>
          <input
            type="number"
            name="Amount"
            step="0.01"
            min="0.01"
            className="form-input"
            placeholder="0.00"
            value={formData.Amount}
            onChange={onChange}
            required
          />
        </div>
        <DateField label="Date" name="Date" value={formData.Date} onChange={onChange} />
      </div>

      {showRefund && (
        <label className="form-check">
          <input type="checkbox" checked={isRefund} onChange={(e) => onRefundToggle?.(e.target.checked)} />
          <span>This is a refund or credit</span>
        </label>
      )}

      {showForeign && (
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">Foreign amount (optional)</label>
            <input
              type="number"
              name="ForeignAmount"
              step="0.01"
              className="form-input"
              placeholder="0.00"
              value={foreignAmount}
              onChange={onForeignChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Foreign currency</label>
            <input
              type="text"
              name="ForeignCurrency"
              className="form-input"
              placeholder="USD"
              value={foreignCurrency}
              onChange={onForeignChange}
            />
          </div>
        </div>
      )}

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Category</label>
          <select
            name="Category"
            className="form-input"
            value={formData.Category}
            onChange={onChange}
            required
          >
            {config.CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Card</label>
          <select name="Card" className="form-input" value={formData.Card} onChange={onChange}>
            <option value="">Select card</option>
            {cardOptions.map((card) => (
              <option key={card} value={card}>{card}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <input
          type="text"
          name="Notes"
          className="form-input"
          placeholder="Optional"
          value={formData.Notes}
          onChange={onChange}
        />
      </div>

      {showReceipt && (
        <div className="form-group">
          <label className="form-label">Receipt</label>
          <label className={`upload-zone ${receiptFile || formData.ReceiptUrl ? 'upload-zone-active' : ''}`}>
            {receiptFile || formData.ReceiptUrl ? <ImageIcon size={20} /> : <Upload size={20} />}
            <span>
              {receiptFile
                ? receiptFile.name
                : formData.ReceiptUrl
                  ? 'Update receipt'
                  : 'Tap to upload'}
            </span>
            <input type="file" accept="image/*" onChange={onFileChange} hidden />
          </label>
        </div>
      )}
    </>
  );
};

export default TransactionForm;
