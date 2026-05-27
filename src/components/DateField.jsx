import { formatDisplayDate } from '../utils/date';

const DateField = ({ label, name, value, onChange, required = true, className = 'form-input' }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <div
      className={`date-display-container ${className}`}
      style={{ position: 'relative' }}
      onClick={(e) => e.currentTarget.querySelector('input')?.showPicker()}
    >
      <span className="date-display-text">{formatDisplayDate(value) || 'Select Date'}</span>
      <input
        type="date"
        name={name}
        className="date-picker-hidden"
        value={value}
        onChange={onChange}
        required={required}
      />
    </div>
  </div>
);

export default DateField;
