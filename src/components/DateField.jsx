import { useRef } from 'react';
import { formatDisplayDate } from '../utils/date';

const DateField = ({ label, name, value, onChange, required = true }) => {
  const inputRef = useRef(null);
  const openPicker = () => inputRef.current?.showPicker?.();

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <button
        type="button"
        className="date-display-container form-input"
        onClick={openPicker}
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
        />
      </button>
    </div>
  );
};

export default DateField;
