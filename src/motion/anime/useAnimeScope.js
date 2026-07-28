import { useEffect, useRef } from 'react';
import { createScope } from 'animejs/scope';
import { motionEnabled } from './reducedMotion';

/**
 * React hook wrapping anime.js createScope with automatic revert on unmount/deps change.
 */
export const useAnimeScope = (rootRef, factory, deps = []) => {
  const scopeRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !motionEnabled()) return undefined;

    scopeRef.current = createScope({ root }).add(() => {
      factory(root);
    });

    return () => {
      scopeRef.current?.revert();
      scopeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- factory/deps intentional
  }, deps);
};

export default useAnimeScope;
