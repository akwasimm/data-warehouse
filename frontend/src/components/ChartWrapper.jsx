import GlassCard from './GlassCard';
import Reveal from './Reveal';

/** Glass card + heading + fixed chart height, so Recharts' ResponsiveContainer
 *  has a real box to measure. The card title is the chart title — charts never
 *  carry their own internal heading. */
export default function ChartWrapper({
  title,
  subtitle,
  note,
  height = 250,
  accent,
  children,
  aside,
  delay = 0,
}) {
  return (
    <Reveal delay={delay} style={{ height: '100%' }}>
      <GlassCard className="glass--pad-lg" style={{ height: '100%' }}>
        {(title || aside) && (
          <div className="cardhead">
            <div style={{ minWidth: 0 }}>
              {title && (
                <h3 className="card__title" style={{ color: accent ?? 'var(--text-primary)' }}>
                  {title}
                </h3>
              )}
              {subtitle && <p className="card__text">{subtitle}</p>}
            </div>
            {aside && <div className="card__corner">{aside}</div>}
          </div>
        )}
        {/* Literal height, no flex: a flex:1 child inside a height:100% card
            inside an auto-height grid row collapses to 0 and Recharts renders
            an empty wrapper. */}
        <div style={{ width: '100%', height }}>{children}</div>
        {note && (
          <p className="micro" style={{ margin: '0.9rem 0 0' }}>
            {note}
          </p>
        )}
      </GlassCard>
    </Reveal>
  );
}
