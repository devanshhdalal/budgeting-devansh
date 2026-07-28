import { useEffect, useRef } from 'react';
import { animate } from 'animejs/animation';
import { onScroll } from 'animejs/events';
import { stagger } from 'animejs/utils';
import { easings } from './easings';
import { motionEnabled } from './reducedMotion';

const isAboveFold = (el) => {
  if (!el || typeof window === 'undefined') return true;
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight * 0.92;
};

const getTargets = (sectionEl, childSelector) => {
  if (sectionEl.matches?.(childSelector)) return [sectionEl];
  return [...sectionEl.querySelectorAll(childSelector)];
};

/** Animate targets fading up with optional stagger. */
export const animateOnEnter = (targets, { staggerMs = 70, duration = 520, y = 28 } = {}) => {
  if (!targets?.length || !motionEnabled()) {
    if (targets?.length) {
      targets.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }
    return null;
  }

  const list = targets instanceof NodeList ? [...targets] : Array.isArray(targets) ? targets : [targets];

  return animate(list, {
    opacity: [0, 1],
    y: [y, 0],
    duration,
    ease: easings.clayOut,
    delay: stagger(staggerMs, { from: 'start' }),
  });
};

/** Attach scroll-triggered reveal to a section element. */
export const attachScrollReveal = (sectionEl, childSelector = '[data-scroll-item]', onVisible) => {
  if (!sectionEl || !motionEnabled()) {
    onVisible?.();
    return undefined;
  }

  const children = getTargets(sectionEl, childSelector);
  if (!children.length) {
    onVisible?.();
    return undefined;
  }

  const reveal = () => {
    onVisible?.();
    return animateOnEnter(children);
  };

  if (isAboveFold(sectionEl)) {
    return reveal();
  }

  let done = false;
  const fireVisible = () => {
    if (!done) {
      done = true;
      onVisible?.();
    }
  };

  return animate(children, {
    opacity: [0, 1],
    y: [28, 0],
    duration: 520,
    ease: easings.clayOut,
    autoplay: onScroll({
      target: sectionEl,
      enter: 'bottom top-=12%',
    }),
    delay: stagger(70, { from: 'start' }),
    onBegin: fireVisible,
  });
};

export const useScrollSection = (
  ref,
  { mount = false, childSelector = '[data-scroll-item]', deps = [], onVisible } = {}
) => {
  const animRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    animRef.current?.revert?.();

    if (mount) {
      const children = getTargets(el, childSelector);
      if (children.length) {
        onVisible?.();
        animRef.current = animateOnEnter(children, { staggerMs: 80, y: 20 });
      }
    } else {
      animRef.current = attachScrollReveal(el, childSelector, onVisible);
    }

    return () => {
      animRef.current?.revert?.();
      animRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

/** KPI count-up when section enters viewport. */
export const useInViewCountUp = (sectionRef, valueRef, value, formatFn, deps = []) => {
  useEffect(() => {
    const section = sectionRef.current;
    const el = valueRef.current;
    if (!section || !el) return undefined;

    const run = () => {
      if (!motionEnabled()) {
        el.textContent = formatFn(value);
        return;
      }
      const obj = { val: 0 };
      animate(obj, {
        val: value,
        duration: 680,
        ease: easings.heroSpring,
        onUpdate: () => {
          el.textContent = formatFn(obj.val);
        },
      });
    };

    if (isAboveFold(section)) {
      run();
      return undefined;
    }

    if (!motionEnabled()) {
      el.textContent = formatFn(value);
      return undefined;
    }

    let ran = false;
    const anim = animate(section, {
      opacity: [1, 1],
      duration: 1,
      autoplay: onScroll({
        target: section,
        enter: 'bottom top-=15%',
      }),
      onBegin: () => {
        if (!ran) {
          ran = true;
          run();
        }
      },
    });

    return () => anim?.revert?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, formatFn, ...deps]);
};

export default useScrollSection;
