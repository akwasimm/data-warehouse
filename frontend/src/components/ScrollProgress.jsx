import { useEffect, useState } from 'react';

/**
 * Thin bar showing how much of the narrative the reader has scrolled through.
 * Written as a passive scroll listener rather than a CSS scroll-driven
 * animation because the latter is still not universally supported.
 */
export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="progress" role="presentation">
      <div className="progress__bar" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
