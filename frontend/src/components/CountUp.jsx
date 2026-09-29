import { useEffect, useRef, useState } from 'react';

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Counts a number up the first time it scrolls into view.
 *
 * The animated digits are decorative: `aria-label` always carries the final
 * value, so assistive tech reads the real number no matter where the animation
 * happens to be, and `prefers-reduced-motion` just renders it settled.
 */
export default function CountUp({ value, format = String, duration = 1100 }) {
  const ref = useRef(null);
  // format() already renders the '--' placeholder for a missing value, so the
  // pre-animation frame matches the old static render exactly.
  const [display, setDisplay] = useState(format(value));
  const played = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof value !== 'number' || played.current) return;

    if (prefersReducedMotion()) {
      played.current = true;
      setDisplay(format(value));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || played.current) return;
        played.current = true;
        observer.disconnect();

        const from = 0;
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          setDisplay(format(from + (value - from) * easeOut(progress)));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, format, duration]);

  return (
    <span
      ref={ref}
      aria-label={typeof value === 'number' ? format(value) : undefined}
    >
      {display}
    </span>
  );
}
