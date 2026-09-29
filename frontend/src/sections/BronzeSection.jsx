import { useApi } from '../utils/api';
import { formatCompact, formatNumber } from '../utils/format';
import GlassCard from '../components/GlassCard';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import SectionTitle from '../components/SectionTitle';
import TableExplorer from '../components/TableExplorer';
import { AsyncState, SkeletonBlock } from '../components/States';

const ACCENT = 'var(--bronze)';

export default function BronzeSection() {
  const stats = useApi('/bronze/stats');

  return (
    <section className="section" id="bronze">
      <div className="section__inner">
        <Reveal>
          <SectionTitle
            accent={ACCENT}
            id="bronze-title"
            chapter="02"
            kicker="The raw landing zone"
            lede="Every table here is a source system’s file exactly as it arrived — which is what makes the layer useful: the row counts below are the baseline silver is measured against."
          >
            Bronze
          </SectionTitle>
        </Reveal>

        <div className="stack">
          <div className="grid grid--3">
            <Reveal>
              <GlassCard className="glass--pad glass--interactive" style={{ height: '100%' }}>
                <p className="kpi__label">Total rows</p>
                <AsyncState
                  loading={stats.loading}
                  error={stats.error}
                  data={stats.data}
                  skeleton={<div className="skeleton" style={{ height: 44 }} />}
                >
                  {(d) => (
                    <div className="kpi__value">
                      <CountUp value={d.total_rows} format={formatNumber} />
                    </div>
                  )}
                </AsyncState>
                <p className="card__text" style={{ margin: '0.5rem 0 0' }}>
                  Untransformed rows across every source
                </p>
              </GlassCard>
            </Reveal>

            <Reveal delay={90}>
              <GlassCard className="glass--pad glass--interactive" style={{ height: '100%' }}>
                <p className="kpi__label">Tables</p>
                <AsyncState
                  loading={stats.loading}
                  error={stats.error}
                  data={stats.data}
                  skeleton={<div className="skeleton" style={{ height: 44 }} />}
                >
                  {(d) => (
                    <div className="kpi__value">
                      <CountUp value={d.total_tables} format={formatNumber} />
                    </div>
                  )}
                </AsyncState>
                <p className="card__text" style={{ margin: '0.5rem 0 0' }}>
                  {stats.data?.sources?.length
                    ? `From ${stats.data.sources.join(' and ')}`
                    : 'Discovered from the catalog'}
                </p>
              </GlassCard>
            </Reveal>

            <Reveal delay={180}>
              <GlassCard className="glass--pad glass--interactive" style={{ height: '100%' }}>
                <p className="kpi__label">Columns</p>
                <AsyncState
                  loading={stats.loading}
                  error={stats.error}
                  data={stats.data}
                  skeleton={<div className="skeleton" style={{ height: 44 }} />}
                >
                  {(d) => (
                    <div className="kpi__value">
                      <CountUp value={d.total_columns} format={formatNumber} />
                    </div>
                  )}
                </AsyncState>
                <p className="card__text" style={{ margin: '0.5rem 0 0' }}>
                  As landed, before any type or name changes
                </p>
              </GlassCard>
            </Reveal>
          </div>

          <Reveal delay={120}>
            <GlassCard className="glass--pad">
              <h3 className="card__title">Browse the raw tables</h3>
              <p className="card__subtitle">
                Pick a table and read the first {10} rows straight from the warehouse
              </p>
              <TableExplorer layer="bronze" accent={ACCENT} />
            </GlassCard>
          </Reveal>

          <Reveal delay={60}>
            <div className="grid grid--2">
              <GlassCard className="glass--pad">
                <h3 className="card__title">Why it matters</h3>
                <p className="card__text">
                  Bronze is deliberately unopinionated. Keeping the raw shape means a
                  pipeline bug can always be traced: you can see exactly what arrived
                  before deciding what silver did with it.
                </p>
                <p className="card__text" style={{ margin: 0 }}>
                  Nothing in this section is computed. Row counts come from
                  <span className="mono"> COUNT(*)</span> against the live catalog.
                </p>
              </GlassCard>

              <GlassCard className="glass--pad">
                <h3 className="card__title">Row counts</h3>
                <p className="card__subtitle">Live, per table</p>
                <BronzeCounts />
              </GlassCard>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function BronzeCounts() {
  const { data, loading, error } = useApi('/bronze/tables');
  if (loading) return <SkeletonBlock rows={4} height={34} />;
  if (error) return <p className="state__hint">{error}</p>;
  if (!data?.length) return <p className="state__hint">No bronze tables found.</p>;

  return (
    <div>
      {data.map((t) => (
        <div className="stat" key={t.object_name}>
          <span className="stat__value mono" style={{ fontSize: '1.05rem' }}>
            {t.object_name}
          </span>
          <span className="stat__label">
            <CountUp value={t.row_count} format={formatCompact} /> rows ·{' '}
            {t.column_count} columns · {t.source}
          </span>
        </div>
      ))}
    </div>
  );
}
