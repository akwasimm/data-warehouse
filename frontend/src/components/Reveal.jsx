import { useEffect, useRef, useState } from 'react';

/**
 * Fade a block in the first time it scrolls into view. Respects
 * prefers-reduced-motion via the CSS opt-out rule.
 *
 * IntersectionObserver alone is not enough: it is sampled once per frame, so a
 * jump scroll (End key, scrollbar drag, restored scroll position) skips every
 * block in between and those stay at opacity 0 forever. The rAF-throttled rect
 * check is the fallback that makes "revealed" mean "revealed", not "scrolled
 * past slowly".
 */
export default function Reveal({ children, delay = 0, as: Tag = 'div', className = '', ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const check = () => {
      frame = 0;
      if (node.getBoundingClientRect().top < window.innerHeight) setVisible(true);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };

    // Anything already in view at mount (or above it) shows immediately.
    check();

    let observer = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
          }
        },
        { threshold: 0.01, rootMargin: '0px 0px -8% 0px' },
      );
      observer.observe(node);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
