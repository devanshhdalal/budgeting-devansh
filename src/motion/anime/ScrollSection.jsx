import { forwardRef, useCallback, useRef } from 'react';
import { useScrollSection } from './scrollReveal';

/**
 * Wraps a page section with scroll-triggered reveal animation.
 * - mount=true — animates children on page load (hero blocks)
 * - mount=false — animates when scrolled into view
 */
const ScrollSection = forwardRef(({
  children,
  className = '',
  as: Tag = 'section',
  mount = false,
  childSelector = '[data-scroll-item]',
  deps = [],
  onVisible,
}, ref) => {
  const innerRef = useRef(null);
  const visibleRef = useRef(false);

  const setRef = useCallback(
    (node) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  useScrollSection(innerRef, { mount, childSelector, deps, onVisible: () => {
    if (!visibleRef.current) {
      visibleRef.current = true;
      onVisible?.();
    }
  } });

  return (
    <Tag
      ref={setRef}
      className={`scroll-section ${mount ? 'scroll-section--mount' : 'scroll-section--scroll'} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
});

ScrollSection.displayName = 'ScrollSection';

export default ScrollSection;
