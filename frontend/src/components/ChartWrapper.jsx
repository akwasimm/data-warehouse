import GlassCard from './GlassCard';
import Reveal from './Reveal';

/** Glass card + heading + fixed chart height, so every chart in the page
 *  measures identically and Recharts' ResponsiveContainer has a real box. */
export default function ChartWrapper({
  title,
  subtitle,
  note,
  height = 300,
  accent,
  children,
  aside,
}) {
  return (
    <Reveal>
      <GlassCard className="glass--pad" style={{ padding: '1.4rem' }}>
        {(title || aside) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
              marginBottom: '1.1rem',
            }}
          >
            <div>
              {title && (
                <h3 className="card__title" style={{ color: accent ?? 'var(--text-primary)' }}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
            {aside}
          </div>
        )}
        <div style={{ width: '100%', height }}>{children}</div>
        {note && (
          <p style={{ margin: '0.9rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {note}
          </p>
        )}
      </GlassCard>
    </Reveal>
  );
}
