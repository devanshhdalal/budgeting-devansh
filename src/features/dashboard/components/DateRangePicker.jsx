import { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatDisplayDate } from '@/utils/date';

const DateRangePicker = ({ startDate, endDate, setStartDate, setEndDate }) => {
  const startRef = useRef(null);
  const endRef = useRef(null);

  return (
    <div className="date-range-pill">
      <div className="date-range-input-wrapper">
        <Calendar size={14} className="date-icon" />
        <div className="date-display-container" onClick={() => startRef.current?.showPicker?.()}>
          <span className="date-display-text">{formatDisplayDate(startDate) || 'Start'}</span>
          <input
            ref={startRef}
            type="date"
            className="date-picker-hidden"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>
      <span className="date-separator">to</span>
      <div className="date-range-input-wrapper">
        <div className="date-display-container" onClick={() => endRef.current?.showPicker?.()}>
          <span className="date-display-text">{formatDisplayDate(endDate) || 'End'}</span>
          <input
            ref={endRef}
            type="date"
            className="date-picker-hidden"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;
