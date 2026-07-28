import { useEffect } from 'react';
import { animate } from 'animejs/animation';
import { onScroll } from 'animejs/events';
import { stagger } from 'animejs/utils';
import { easings } from './easings';
import { motionEnabled } from './reducedMotion';

/** Fade + rise children when section enters viewport. */
export const attachScrollReveal = (sectionEl, childSelector = '.scroll-reveal-item') => {
  if (!sectionEl || !motionEnabled()) return undefined;

  const children = sectionEl.querySelectorAll(childSelector);
  if (!children.length) return undefined;

  return animate(children, {
    opacity: [0, 1],
    y: [24, 0],
    duration: 520,
    ease: easings.clayOut,
    autoplay: onScroll({
      target: sectionEl,
      enter: 'bottom top-=80',
    }),
    delay: stagger(70, { from: 'start' }),
  });
};

export const useScrollReveal = (sectionRef, childSelector = '.scroll-reveal-item', deps = []) => {
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const anim = attachScrollReveal(el, childSelector);
    return () => anim?.revert?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export default useScrollReveal;
