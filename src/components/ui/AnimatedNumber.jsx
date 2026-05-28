import { useEffect, useRef, useState } from 'react';

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Counts up smoothly when `value` changes.
 * `format` lets the caller render formatted output (e.g. currency).
 */
const AnimatedNumber = ({ value, duration = 700, format = (n) => n.toFixed(0) }) => {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef(null);

  useEffect(() => {
    cancelAnimationFrame(frameRef.current);
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = easeOutCubic(t);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return <>{format(display)}</>;
};

export default AnimatedNumber;
