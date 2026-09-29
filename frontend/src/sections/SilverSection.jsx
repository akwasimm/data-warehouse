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
import CountUp from '../components/CountUp';
import Reveal from '../components/Reveal';
import SectionTitle from '../components/SectionTitle';
import TableExplorer from '../components/TableExplorer';
import { AsyncState, EmptyState, SkeletonBlock } from '../components/States';

const ACCENT = 'var(--silver)';
const BRONZE_COLOR = '#B45309';
const SILVER_COLOR = '#64748B';

export default function SilverSection() {
  const stats = useApi('/silver/stats');
  const comparison = useApi('/silver/comparison');

  return (
    <section className="section" id="silver">
      <div className="section__inner">
        <Reveal>
          <SectionTitle num={3} id="silver-title" accent={ACCENT} subtitle="Cleaned. Deduped. Typed.">
            Silver layer
          </SectionTitle>
        </Reveal>

        <div className="grid grid--silver">
          <div className="stack">
            <Reveal delay={0}>
              <GlassCard className="glass--pad" style={{ flex: 1 }}>
                <p className="kpi__label">Duplicates removed</p>
                <AsyncState
                  loading={stats.loading}
                  error={stats.error}
                  data={stats.data}
                  skeleton={<SkeletonBlock rows={1} height={34} />}
                >
                  {(d) => (
                    <div className="statline__value" style={{ color: d.duplicates_removed > 0 ? 'var(--ok)' : undefined }}>
                      <CountUp value={d.duplicates_removed} format={formatNumber} />
                    </div>
                  )}
                </AsyncState>
              </GlassCard>
            </Reveal>

            <Reveal delay={100}>
              <GlassCard className="glass--pad" style={{ flex: 1 }}>
                <p className="kpi__label">Dedupe rate</p>
                <AsyncState
                  loading={stats.loading}
                  error={stats.error}
                  data={stats.data}
                  skeleton={<SkeletonBlock rows={1} height={34} />}
                >
                  {(d) => (
                    <div className="statline__value">
                      <CountUp
                        value={d.bronze_rows ? d.dedup_rate * 100 : 0}
                        format={(v) => `${v.toFixed(3)}%`}
                        duration={900}
                      />
                    </div>
                  )}
                </AsyncState>
                <p className="card__text">Share of bronze rows dropped.</p>
              </GlassCard>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <GlassCard className="glass--pad" style={{ height: '100%' }}>
              <p className="kpi__label">Rows retained</p>
              <AsyncState
                loading={stats.loading}
                error={stats.error}
                data={stats.data}
                skeleton={<SkeletonBlock rows={1} height={34} />}
              >
                {(d) => (
                  <div className="statline__value">
                    <CountUp value={d.total_rows} format={formatCompact} />
                  </div>
                )}
              </AsyncState>
              <p className="card__text">From {formatNumber(stats.data?.bronze_rows ?? 0)} bronze rows.</p>
            </GlassCard>
          </Reveal>

          <Reveal delay={300}>
            <GlassCard className="glass--pad-lg" style={{ height: '100%' }}>
              <div className="cardhead">
                <div>
                  <h3 className="card__title" style={{ color: ACCENT }}>Bronze vs silver</h3>
                  <p className="card__text">A gap is a row cleaning removed.</p>
                </div>
              </div>
              <div style={{ width: '100%', height: 400 }}>
                <AsyncState
                  loading={comparison.loading}
                  error={comparison.error}
                  data={comparison.data}
                  skeleton={<SkeletonBlock rows={1} height={400} />}
                >
                  {(rows) =>
                    rows.length ? (
                      <ResponsiveContainer>
                        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid {...GRID} horizontal={false} vertical />
                          <XAxis type="number" {...AXIS} tickFormatter={formatCompact} />
                          <YAxis type="category" dataKey="table_name" {...AXIS} width={140} />
                          <Tooltip content={<GlassTooltip formatter={formatCompact} />} cursor={{ fill: 'rgba(15,23,42,0.035)' }} />
                          <Bar dataKey="bronze_rows" name="bronze" fill={BRONZE_COLOR} radius={[0, 3, 3, 0]} maxBarSize={10} isAnimationActive animationDuration={ANIM} />
                          <Bar dataKey="silver_rows" name="silver" fill={SILVER_COLOR} radius={[0, 3, 3, 0]} maxBarSize={10} isAnimationActive animationDuration={ANIM} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState title="Nothing to compare yet" hint="Load both layers to see the cleaning delta." />
                    )
                  }
                </AsyncState>
              </div>
            </GlassCard>
          </Reveal>

          <Reveal delay={0} className="grid-span-2" style={{ gridColumn: '1 / span 2' }}>
            <GlassCard className="glass--pad-lg" style={{ height: '100%' }}>
              <div className="cardhead">
                <div>
                  <h3 className="card__title" style={{ color: ACCENT }}>Cleaned tables</h3>
                  <p className="card__text">Rows, or the column types silver settled on.</p>
                </div>
              </div>
              <TableExplorer layer="silver" accent={ACCENT} withSchema />
            </GlassCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
