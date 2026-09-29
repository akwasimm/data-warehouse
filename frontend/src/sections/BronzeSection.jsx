import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApi } from '../utils/api';
import { ANIM, AXIS, GRID } from '../utils/chartTheme';
import GlassTooltip from '../components/GlassTooltip';
import { formatCompact, formatNumber } from '../utils/format';
import GlassCard from '../components/GlassCard';
import GlassTable from '../components/GlassTable';
import CountUp from '../components/CountUp';
import Reveal from '../components/Reveal';
import SectionTitle from '../components/SectionTitle';
import TableExplorer from '../components/TableExplorer';
import { AsyncState, SkeletonBlock } from '../components/States';

const ACCENT = 'var(--bronze)';

function StatLine({ label, value, format = formatNumber }) {
  return (
    <div className="statline">
      <span className="statline__value">
        {typeof value === 'number' ? <CountUp value={value} format={format} /> : (value ?? '--')}
      </span>
      <span className="statline__label">{label}</span>
    </div>
  );
}

export default function BronzeSection() {
  const stats = useApi('/bronze/stats');
  const tables = useApi('/bronze/tables');

  const chartData = (tables.data ?? [])
    .slice()
    .sort((a, b) => b.row_count - a.row_count)
    .map((t) => ({ name: t.object_name, rows: t.row_count }));

  return (
    <section className="section" id="bronze">
      <div className="section__inner">
        <Reveal>
          <SectionTitle num={2} id="bronze-title" accent={ACCENT} subtitle="Raw ingestion. Untouched.">
            Bronze layer
          </SectionTitle>
        </Reveal>

        <div className="stack">
          <div className="grid grid--bronze">
            <Reveal delay={0}>
              <GlassCard className="glass--pad-lg" style={{ height: '100%' }}>
                <div className="cardhead">
                  <div>
                    <h3 className="card__title" style={{ color: ACCENT }}>Rows per table</h3>
                    <p className="card__text">Exactly as each source system delivered it.</p>
                  </div>
                </div>
                <div style={{ width: '100%', height: 360 }}>
                  <AsyncState
                    loading={tables.loading}
                    error={tables.error}
                    data={tables.data}
                    skeleton={<SkeletonBlock rows={1} height={360} />}
                  >
                    {(rows) =>
                      rows.length ? (
                        <ResponsiveContainer>
                          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                            <CartesianGrid {...GRID} horizontal={false} vertical />
                            <XAxis type="number" {...AXIS} tickFormatter={formatCompact} />
                            <YAxis type="category" dataKey="name" {...AXIS} width={170} tickFormatter={(v) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
                            <Tooltip content={<GlassTooltip formatter={formatCompact} />} cursor={{ fill: 'rgba(15,23,42,0.035)' }} />
                            <Bar
                              dataKey="rows"
                              name="rows"
                              fill="var(--bronze)"
                              radius={[0, 3, 3, 0]}
                              maxBarSize={14}
                              isAnimationActive
                              animationDuration={ANIM}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : null
                    }
                  </AsyncState>
                </div>
              </GlassCard>
            </Reveal>

            <Reveal delay={100}>
              <GlassCard className="glass--pad-lg" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <h3 className="card__title" style={{ color: ACCENT }}>Layer totals</h3>
                <div style={{ marginTop: '1.25rem' }}>
                  {stats.loading ? (
                    <SkeletonBlock rows={3} height={44} />
                  ) : (
                    <>
                      <StatLine label="Tables" value={stats.data?.total_tables} />
                      <StatLine label="Rows" value={stats.data?.total_rows} format={formatCompact} />
                      <StatLine
                        label="Columns"
                        value={stats.data?.total_columns}
                        format={formatCompact}
                      />
                      <StatLine
                        label="Sources"
                        value={stats.data?.sources?.length}
                        format={(v) => String(v ?? '--')}
                      />
                    </>
                  )}
                </div>
                <p className="card__text" style={{ marginTop: 'auto', paddingTop: '1.25rem' }}>
                  No transforms applied. This is the baseline silver is measured against.
                </p>
              </GlassCard>
            </Reveal>
          </div>

          <Reveal delay={0}>
            <GlassCard className="glass--pad-lg">
              <div className="cardhead">
                <div>
                  <h3 className="card__title">Source tables</h3>
                  <p className="card__text">Every bronze object in the catalog.</p>
                </div>
                <span className="badge">
                  {tables.data?.length ?? 0} tables
                </span>
              </div>
              <AsyncState
                loading={tables.loading}
                error={tables.error}
                data={tables.data}
                skeleton={<SkeletonBlock rows={6} height={28} />}
              >
                {(rows) => (
                  <GlassTable
                    columns={[
                      { key: 'object_name', label: 'Table' },
                      { key: 'row_count', label: 'Rows', align: 'right' },
                      { key: 'column_count', label: 'Columns', align: 'right' },
                      { key: 'source', label: 'Source' },
                    ]}
                    rows={rows}
                    accent={ACCENT}
                    empty="No bronze tables in the catalog"
                  />
                )}
              </AsyncState>
            </GlassCard>
          </Reveal>

          <Reveal delay={100}>
            <GlassCard className="glass--pad-lg">
              <div className="cardhead">
                <div>
                  <h3 className="card__title" style={{ color: ACCENT }}>Preview</h3>
                  <p className="card__text">Read the first 10 rows of any table.</p>
                </div>
              </div>
              <TableExplorer layer="bronze" accent={ACCENT} />
            </GlassCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
