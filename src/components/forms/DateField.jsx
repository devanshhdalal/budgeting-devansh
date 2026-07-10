import { useRef } from 'react';
import { formatDisplayDate } from '@/utils/date';

const DateField = ({ label, name, value, onChange, required = true }) => {
  const inputRef = useRef(null);
  const openPicker = () => inputRef.current?.showPicker?.();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div
        role="button"
        tabIndex={0}
        className="date-display-container form-input"
        onClick={openPicker}
        onKeyDown={handleKeyDown}
      >
        <span className="date-display-text">{formatDisplayDate(value) || 'Select date'}</span>
        <input
          ref={inputRef}
          type="date"
          name={name}
          className="date-picker-hidden"
          value={value}
          onChange={onChange}
          required={required}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default DateField;
