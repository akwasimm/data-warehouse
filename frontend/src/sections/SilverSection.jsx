import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApi } from '../utils/api';
import { AXIS, GRID } from '../utils/chartTheme';
import GlassTooltip from '../components/GlassTooltip';
import { formatCompact, formatNumber } from '../utils/format';
import GlassCard from '../components/GlassCard';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import SectionTitle from '../components/SectionTitle';
import TableExplorer from '../components/TableExplorer';
import { AsyncState, EmptyState, SkeletonBlock } from '../components/States';

const ACCENT = 'var(--silver)';
// Darkened from #CD7F32 / #C0C0C0: the metallic values were unreadable as bar
// fills on a light frosted surface.
const BRONZE_COLOR = '#B45309';
const SILVER_COLOR = '#64748B';

export default function SilverSection() {
  const stats = useApi('/silver/stats');
  const comparison = useApi('/silver/comparison');

  return (
    <section className="section" id="silver">
      <div className="section__inner">
        <Reveal>
          <SectionTitle
            accent={ACCENT}
            id="silver-title"
            chapter="03"
            kicker="From raw to reliable"
            lede="This is where the warehouse becomes trustworthy. Silver is deduplicated, typed, and named consistently — and it is the only layer that records when the pipeline last touched a row."
          >
            Silver
          </SectionTitle>
        </Reveal>

        <div className="stack">
          <div className="grid grid--4">
            <Reveal>
              <SilverStat label="Total rows" accessor={(d) => d.total_rows} loading={stats.loading} error={stats.error} data={stats.data} />
            </Reveal>
            <Reveal delay={70}>
              <SilverStat label="Tables" accessor={(d) => d.total_tables} loading={stats.loading} error={stats.error} data={stats.data} />
            </Reveal>
            <Reveal delay={140}>
              <SilverStat
                label="Duplicates removed"
                accessor={(d) => d.duplicates_removed}
                loading={stats.loading}
                error={stats.error}
                data={stats.data}
                accent={d => (d.duplicates_removed > 0 ? 'var(--ok)' : undefined)}
              />
            </Reveal>
            <Reveal delay={210}>
              <GlassCard className="glass--pad glass--interactive" style={{ height: '100%' }}>
                <p className="kpi__label">Dedupe rate</p>
                <AsyncState
                  loading={stats.loading}
                  error={stats.error}
                  data={stats.data}
                  skeleton={<div className="skeleton" style={{ height: 44 }} />}
                >
                  {(d) => (
                    <div className="kpi__value">
                      <CountUp
                        value={d.bronze_rows ? d.dedup_rate * 100 : 0}
                        format={(v) => `${v.toFixed(3)}%`}
                        duration={900}
                      />
                    </div>
                  )}
                </AsyncState>
                <p className="card__text" style={{ margin: '0.5rem 0 0' }}>
                  Share of bronze rows dropped as duplicates
                </p>
              </GlassCard>
            </Reveal>
          </div>

          <Reveal delay={90}>
            <GlassCard className="glass--pad">
              <h3 className="card__title">Bronze vs silver</h3>
              <p className="card__subtitle">
                Every table present in both layers — a difference is a row the cleaning
                step removed
              </p>
              <AsyncState
                loading={comparison.loading}
                error={comparison.error}
                data={comparison.data}
                skeleton={<SkeletonBlock rows={1} height={280} />}
              >
                {(rows) =>
                  rows.length ? (
                    <div style={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={rows}
                          layout="vertical"
                          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                        >
                          <CartesianGrid {...GRID} horizontal={false} vertical />
                          <XAxis type="number" {...AXIS} tickFormatter={formatCompact} />
                          <YAxis type="category" dataKey="table_name" {...AXIS} width={130} />
                          <Tooltip content={<GlassTooltip formatter={formatCompact} />} />
                          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(15,23,42,0.6)' }} />
                          <Bar dataKey="bronze_rows" name="bronze" fill={BRONZE_COLOR} radius={[0, 4, 4, 0]} />
                          <Bar dataKey="silver_rows" name="silver" fill={SILVER_COLOR} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState title="Nothing to compare yet" hint="Load both layers to see the cleaning delta." />
                  )
                }
              </AsyncState>

              <div style={{ marginTop: '1.25rem' }}>
                <AsyncState
                  loading={comparison.loading}
                  error={comparison.error}
                  data={comparison.data}
                  skeleton={<SkeletonBlock rows={3} height={34} />}
                >
                  {(rows) => (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th scope="col">Table</th>
                            <th scope="col" className="num">Bronze</th>
                            <th scope="col" className="num">Silver</th>
                            <th scope="col" className="num">Removed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.table_name}>
                              <td className="mono">{r.table_name}</td>
                              <td className="num">{formatNumber(r.bronze_rows)}</td>
                              <td className="num">{formatNumber(r.silver_rows)}</td>
                              <td
                                className="num"
                                style={{ color: r.removed ? 'var(--ok)' : 'var(--text-muted)' }}
                              >
                                {r.removed > 0 ? `-${formatNumber(r.removed)}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </AsyncState>
              </div>
            </GlassCard>
          </Reveal>

          <Reveal delay={60}>
            <GlassCard className="glass--pad">
              <h3 className="card__title">Cleaned tables</h3>
              <p className="card__subtitle">
                Browse the rows, or switch to the column types silver settled on
              </p>
              <TableExplorer layer="silver" accent={ACCENT} withSchema />
            </GlassCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function SilverStat({ label, accessor, loading, error, data, accent }) {
  return (
    <GlassCard className="glass--pad glass--interactive" style={{ height: '100%' }}>
      <p className="kpi__label">{label}</p>
      <AsyncState
        loading={loading}
        error={error}
        data={data}
        skeleton={<div className="skeleton" style={{ height: 44 }} />}
      >
        {(d) => (
          <div className="kpi__value" style={accent ? { color: accent(d) } : undefined}>
            <CountUp value={accessor(d)} format={formatNumber} />
          </div>
        )}
      </AsyncState>
    </GlassCard>
  );
}
