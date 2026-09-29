import GlassCard from './GlassCard';
import { formatCompact } from '../utils/format';
import CountUp from './CountUp';

/**
 * One headline metric. `compact` is the number-left / trend-right strip used
 * in the gold KPI row; the default is a taller card for side columns.
 * `trend` comes from the API's month-over-month delta, which only exists
 * where a real previous period does.
 */
export default function KPICard({
  label,
  value,
  trend,
  accent = 'var(--gold)',
  prefix = '',
  compact = false,
}) {
  const valueNode = (
    <span className="kpi__value">
      {prefix}
      <CountUp value={value} format={formatCompact} />
    </span>
  );

  const trendNode = trend ? (
    <span className={`kpi__trend kpi__trend--${trend.direction}`}>
      <span aria-hidden="true">{trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}</span>
      {Math.abs(trend.percent).toFixed(1)}%
    </span>
  ) : (
    <span className="kpi__trend kpi__trend--flat">Full period</span>
  );

  if (compact) {
    return (
      <GlassCard className="kpi--compact glass--sm glass--interactive" style={{ height: '100%' }}>
        <div style={{ minWidth: 0 }}>
          <p className="kpi__label">{label}</p>
          {valueNode}
        </div>
        <span className="dot" style={{ background: accent }} aria-hidden="true" />
        {trendNode}
      </GlassCard>
    );
  }

  return (
    <GlassCard className="glass--pad glass--interactive" style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <p className="kpi__label">{label}</p>
        <span className="dot" style={{ background: accent, marginTop: 4 }} aria-hidden="true" />
      </div>
      {valueNode}
      <div style={{ marginTop: '0.5rem' }}>{trendNode}</div>
    </GlassCard>
  );
}
