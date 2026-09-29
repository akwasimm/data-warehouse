import GlassCard from './GlassCard';
import { formatCompact } from '../utils/format';
import CountUp from './CountUp';

/** One headline metric. `trend` comes straight from the API's month-over-month
 *  delta, which is only present where a real previous period exists. */
export default function KPICard({ label, value, trend, accent = 'var(--gold)', icon = '◆', prefix = '' }) {
  return (
    <GlassCard className="glass--pad glass--interactive" accent={accent} style={{ padding: '1.35rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p className="kpi__label">{label}</p>
        <span style={{ color: accent, fontSize: '0.95rem' }} aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="kpi__value" style={{ color: 'var(--text-primary)' }}>
        {prefix}
        <CountUp value={value} format={formatCompact} />
      </div>
      {trend ? (
        <div className={`kpi__trend kpi__trend--${trend.direction}`}>
          <span aria-hidden="true">{trend.direction === 'up' ? '▲' : '▼'}</span>
          <span>
            {Math.abs(trend.percent).toFixed(1)}% vs prev. month
          </span>
        </div>
      ) : (
        <div className="kpi__trend" style={{ opacity: 0.5 }}>
          <span>Full period total</span>
        </div>
      )}
    </GlassCard>
  );
}
