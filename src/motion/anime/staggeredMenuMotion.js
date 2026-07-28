/**
 * Minimal animation helpers for StaggeredMenu (anime.js v4).
 */
import { animate } from 'animejs/animation';
import { createTimeline } from 'animejs/timeline';
import { stagger } from 'animejs/utils';
import { easings } from '@/motion/anime/easings';

const mapEase = (ease) => {
  if (!ease) return easings.clayOut;
  if (ease.includes('power4.out')) return 'outQuart';
  if (ease.includes('power3.in')) return 'inCubic';
  if (ease.includes('power3.inOut')) return 'inOutCubic';
  if (ease.includes('power3.out')) return 'outCubic';
  if (ease.includes('power2.out')) return 'outQuad';
  if (ease.includes('power4.out')) return 'outQuart';
  return easings.clayOut;
};

const mapProps = (params) => {
  const { xPercent, yPercent, onComplete, ease, ...rest } = params;
  const mapped = { ...rest, ease: mapEase(ease) };
  if (xPercent !== undefined) mapped.x = `${xPercent}%`;
  if (yPercent !== undefined) mapped.y = `${yPercent}%`;
  if (onComplete) mapped.onComplete = onComplete;
  return mapped;
};

export const animSet = (targets, params) => {
  animate(targets, mapProps({ ...params, duration: 0 }));
};

export const animTo = (targets, params) => {
  const instance = animate(targets, mapProps(params));
  return {
    kill: () => {
      try {
        instance.cancel?.();
      } catch {
        /* noop */
      }
    },
  };
};

export const createAnimTimeline = (options = {}) => {
  const tl = createTimeline({ defaults: { ease: 'outQuart', ...options.defaults } });
  let completeCb = null;

  const wrapper = {
    fromTo(targets, from, to, position) {
      const props = { ...to };
      Object.keys(from).forEach((key) => {
        if (from[key] !== undefined && props[key] !== undefined) {
          props[key] = [from[key], props[key]];
        } else if (from[key] !== undefined) {
          props[key] = from[key];
        }
      });
      if (from.xPercent !== undefined || to.xPercent !== undefined) {
        props.x = [`${from.xPercent ?? to.xPercent}%`, `${to.xPercent ?? from.xPercent}%`];
        delete props.xPercent;
      }
      tl.add(targets, mapProps(props), position);
      return wrapper;
    },
    to(targets, params, position) {
      tl.add(targets, mapProps(params), position);
      return wrapper;
    },
    eventCallback(_name, cb) {
      completeCb = cb;
      return wrapper;
    },
    play() {
      tl.play();
      if (completeCb) {
        tl.then?.(completeCb);
      }
      return wrapper;
    },
    kill() {
      try {
        tl.cancel?.();
      } catch {
        /* noop */
      }
    },
  };

  return wrapper;
};

export { stagger, easings };
