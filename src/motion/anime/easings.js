import { createSpring } from 'animejs/easings/spring';
import { cubicBezier } from 'animejs/easings/cubic-bezier';

export const clayOut = cubicBezier(0.16, 1, 0.3, 1);
export const clayInOut = cubicBezier(0.45, 0.03, 0.15, 1);
export const drawInOut = cubicBezier(0.65, 0, 0.35, 1);
export const quickOut = cubicBezier(0.33, 1, 0.68, 1);

export const heroSpring = createSpring({ stiffness: 120, damping: 14, mass: 1 });
export const snapSpring = createSpring({ stiffness: 380, damping: 32, mass: 1 });
export const softSpring = createSpring({ stiffness: 260, damping: 28, mass: 1 });
export const menuSpring = createSpring({ stiffness: 180, damping: 16, mass: 0.9 });

export const easings = {
  clayOut,
  clayInOut,
  drawInOut,
  quickOut,
  heroSpring,
  snapSpring,
  softSpring,
  menuSpring,
};
