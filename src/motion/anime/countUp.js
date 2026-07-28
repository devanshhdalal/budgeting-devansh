import { useEffect, useRef } from 'react';
import { animate } from 'animejs/animation';
import { easings } from './easings';
import { motionEnabled } from './reducedMotion';

/** Animate a numeric display with spring settle. */
export const useCountUp = (value, { duration = 680, format = formatValue } = {}) => {
  const ref = useRef(null);
  const prevRef = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !motionEnabled()) {
      if (el) el.textContent = format(value);
      prevRef.current = value;
      return;
    }

    const from = prevRef.current;
    const obj = { val: from };
    animate(obj, {
      val: value,
      duration,
      ease: easings.heroSpring,
      onUpdate: () => {
        if (el) el.textContent = format(obj.val);
      },
    });
    prevRef.current = value;
  }, [value, duration, format]);

  return ref;
};

const formatValue = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

/** Draw SVG path from 0 → 1 using createDrawable targets. */
export const animatePathDraw = (drawable, { duration = 900, delay = 0 } = {}) => {
  if (!drawable || !motionEnabled()) return null;
  return animate(drawable, {
    draw: ['0 0', '0 1', '1 1'],
    duration,
    delay,
    ease: easings.drawInOut,
  });
};

/** Stagger horizontal bar widths. */
export const animateBarStagger = (targets, { duration = 520, staggerMs = 40 } = {}) => {
  if (!targets?.length || !motionEnabled()) return null;
  return animate(targets, {
    scaleX: [0, 1],
    duration,
    delay: (_, i) => i * staggerMs,
    ease: easings.clayOut,
  });
};

export default useCountUp;
