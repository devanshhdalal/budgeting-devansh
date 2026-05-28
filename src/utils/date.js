/** Returns YYYY-MM-DD for a Date object using local calendar fields (no UTC shift). */
const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DISPLAY_OPTIONS = { month: 'short', day: 'numeric', year: 'numeric' };

/** Format a stored date (usually YYYY-MM-DD) for display, e.g. "May 7, 2026". */
export const formatDisplayDate = (dateString) => {
  if (!dateString) return '';

  const iso = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, year, month, day] = iso;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
      'en-US',
      DISPLAY_OPTIONS
    );
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return String(dateString);
  return parsed.toLocaleDateString('en-US', DISPLAY_OPTIONS);
};

export const todayIsoDate = () => toIsoDate(new Date());

export const thisMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toIsoDate(start), end: toIsoDate(end) };
};
