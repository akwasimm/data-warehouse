import { useApi } from '../utils/api';
import { formatCompact, formatDate } from '../utils/format';
import GlassCard from '../components/GlassCard';
import CountUp from '../components/CountUp';
import Reveal from '../components/Reveal';
import SectionTitle from '../components/SectionTitle';
import { SkeletonBlock } from '../components/States';

const NODES = [
  { label: 'Sources', dot: 'var(--text-muted)' },
  { label: 'Bronze', color: 'var(--bronze)', dot: 'var(--bronze)' },
  { label: 'Silver', color: 'var(--silver)', dot: 'var(--silver)' },
  { label: 'Gold', color: 'var(--gold)', dot: 'var(--gold)' },
  { label: 'Dashboard', dot: 'var(--text-muted)' },
];

function LiveBadge() {
  const { data } = useApi('/health');
  const ok = data?.status === 'ok';
  const color = ok ? 'var(--ok)' : 'var(--bad)';

  return (
    <span className="badge" style={{ color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)` }}>
      <span className="dot" style={{ background: color }} aria-hidden="true" />
      {ok ? 'Live' : 'Offline'}
    </span>
  );
}

/** The cross-layer row counts, as the medium cell of the stat strip. */
function LayerBars({ totals }) {
  const max = Math.max(...totals.map((t) => t.rows), 1);

  return (
    <div className="minibars">
      {totals.map((t) => (
        <div className="minibar" key={t.key}>
          <span>{t.key}</span>
          <span className="minibar__track">
            <span
              className="minibar__fill"
              style={{ width: `${(t.rows / max) * 100}%`, background: `var(--${t.key})` }}
            />
          </span>
          <span className="minibar__num">
            <CountUp value={t.rows} format={formatCompact} />
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ArchitectureOverview() {
  const { data, loading, error } = useApi('/overview');

  const totals = data
    ? [
        { key: 'bronze', rows: data.bronze.total_rows, objects: data.bronze.total_tables },
        { key: 'silver', rows: data.silver.total_rows, objects: data.silver.total_tables },
        { key: 'gold', rows: data.gold.total_rows, objects: data.gold.total_tables },
      ]
    : [];

  const processed = totals.reduce((sum, t) => sum + t.rows, 0);

  return (
    <section className="section" id="architecture">
      <div className="section__inner">
        <Reveal>
          <SectionTitle num={1} id="architecture-title" accent="var(--text-muted)" subtitle="Where every figure on this page comes from.">
            Architecture
          </SectionTitle>
        </Reveal>

        <div className="stack">
          <Reveal delay={100}>
            <GlassCard className="glass--pad-lg">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
                <h3 className="card__title">Data flow</h3>
                <LiveBadge />
              </div>

              <div className="pipe" role="img" aria-label="Sources flow into bronze, then silver, then gold, and out to this dashboard">
                {NODES.map((node, i) => (
                  <span key={node.label} style={{ display: 'contents' }}>
                    {i > 0 && <span className="pipe__line" aria-hidden="true" />}
                    <span
                      className={`pipe__node${node.color ? ' pipe__node--layer' : ''}`}
                      style={node.color ? { '--node-color': node.color } : undefined}
                    >
                      <span className="pipe__dot" style={{ background: node.dot }} aria-hidden="true" />
                      {node.label}
                    </span>
                  </span>
                ))}
              </div>

              {data?.last_pipeline_run && (
                <p className="micro" style={{ margin: '1.75rem 0 0', textAlign: 'center' }}>
                  Pipeline last run {formatDate(data.last_pipeline_run)}
                </p>
              )}
            </GlassCard>
          </Reveal>

          <div className="strip">
            <Reveal delay={0}>
              <GlassCard className="glass--pad statcard glass--sm">
                {loading ? (
                  <SkeletonBlock rows={2} height={16} />
                ) : (
                  <>
                    <span className="statcard__value">
                      <CountUp value={data?.bronze.total_tables} format={(v) => (v == null ? '--' : String(v))} />
                    </span>
                    <span className="statcard__label">Bronze tables</span>
                  </>
                )}
              </GlassCard>
            </Reveal>

            <Reveal delay={100}>
              <GlassCard className="glass--pad statcard glass--sm">
                <span className="statcard__value">
                  {loading ? <SkeletonBlock rows={1} height={18} /> : <CountUp value={processed} format={formatCompact} />}
                </span>
                <span className="statcard__label">Rows across all layers</span>
                {error ? (
                  <span className="micro" style={{ color: 'var(--bad)' }}>API unreachable</span>
                ) : (
                  totals.length > 0 && <LayerBars totals={totals} />
                )}
              </GlassCard>
            </Reveal>

            <Reveal delay={200}>
              <GlassCard className="glass--pad statcard glass--sm">
                {loading ? (
                  <SkeletonBlock rows={2} height={16} />
                ) : (
                  <>
                    <span className="statcard__value">
                      {formatCompact(data?.gold.total_rows)}
                    </span>
                    <span className="statcard__label">Gold rows</span>
                  </>
                )}
              </GlassCard>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
