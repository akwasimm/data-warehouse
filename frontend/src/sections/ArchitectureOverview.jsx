import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApi } from '../utils/api';
import { AXIS, GRID, PALETTE } from '../utils/chartTheme';
import GlassTooltip from '../components/GlassTooltip';
import { formatCompact, formatDate } from '../utils/format';
import GlassCard from '../components/GlassCard';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import SectionTitle from '../components/SectionTitle';
import { AsyncState, SkeletonBlock } from '../components/States';

const LAYERS = [
  {
    key: 'bronze',
    color: 'var(--bronze)',
    raw: 'var(--bronze)',
    title: 'Bronze — Raw Ingestion',
    body:
      'Landed exactly as it arrived from CRM and ERP, with no business rules applied. ' +
      'This is the audit trail: if a downstream number looks wrong, the raw row is still here.',
    points: [
      'CRM and ERP feeds, one table per source object',
      'No transformation — the source shape is preserved',
      'Row counts compared against silver to expose what cleaning changed',
    ],
  },
  {
    key: 'silver',
    color: 'var(--silver)',
    raw: 'var(--silver)',
    title: 'Silver — Cleaned & Typed',
    body:
      'Deduplicated, correctly typed, and standardised across the medallion. ' +
      'This is the layer analysts trust, and the only layer that records when it last ran.',
    points: [
      'Duplicate customer records removed',
      'Consistent column names and data types across sources',
      'Stamped with a load timestamp on every row',
    ],
  },
  {
    key: 'gold',
    color: 'var(--gold)',
    raw: 'var(--gold)',
    title: 'Gold — Business-Ready',
    body:
      'A star schema built for questions, not for storage: one fact table of sales ' +
      'joined to customer and product dimensions.',
    points: [
      'fact_sales with dim_customers and dim_products',
      'Star schema keyed on customer and product',
      'Feeds every chart on this page',
    ],
  },
];

function PipelineStatus({ data }) {
  if (!data?.last_pipeline_run) return null;
  return (
    <div className="glass glass--pad" style={{ padding: '0.85rem 1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <span style={{ color: 'var(--ok)' }} aria-hidden="true">●</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Last pipeline run{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {formatDate(data.last_pipeline_run)}
          </strong>
        </span>
      </div>
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
  const chartData = totals.map((t) => ({ name: t.key, rows: t.rows }));

  return (
    <section className="section" id="architecture">
      <div className="section__inner">
        <Reveal>
          <SectionTitle
            accent="var(--gold)"
            id="architecture-title"
            chapter="01"
            kicker="How the data is built"
          >
            The architecture
          </SectionTitle>
        </Reveal>

        <div className="stack">
          <div className="grid grid--3">
            {LAYERS.map((layer, i) => (
              <Reveal key={layer.key} delay={i * 90}>
                <GlassCard className="glass--pad glass--interactive" style={{ height: '100%' }}>
                  <p className="card__subtitle" style={{ color: layer.color }}>
                    Layer {i + 1}
                  </p>
                  <h3 className="card__title">{layer.title}</h3>
                  <p className="card__text">{layer.body}</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {layer.points.map((point) => (
                      <li
                        key={point}
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          padding: '0.3rem 0',
                          borderTop: '1px solid var(--glass-border)',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: layer.color }} aria-hidden="true">›</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="flow" aria-label="Data flows from bronze through silver to gold">
              <span className="flow__node">
                <span className="flow__dot" style={{ background: 'var(--bronze)' }} />
                Raw JSON &amp; CSV
              </span>
              <span className="flow__arrow" aria-hidden="true">→</span>
              <span className="flow__node">
                <span className="flow__dot" style={{ background: 'var(--bronze)' }} />
                bronze.{'{'}table{'}'}
              </span>
              <span className="flow__arrow" aria-hidden="true">→</span>
              <span className="flow__node">
                <span className="flow__dot" style={{ background: 'var(--silver)' }} />
                silver.{'{'}table{'}'}
              </span>
              <span className="flow__arrow" aria-hidden="true">→</span>
              <span className="flow__node">
                <span className="flow__dot" style={{ background: 'var(--gold)' }} />
                fact_sales + dims
              </span>
              <span className="flow__arrow" aria-hidden="true">→</span>
              <span className="flow__node">
                <span className="flow__dot" style={{ background: 'rgba(15,23,42,0.35)' }} />
                This dashboard
              </span>
            </div>
          </Reveal>

          <div className="grid grid--2" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
            <Reveal>
              <GlassCard className="glass--pad">
                <h3 className="card__title">Rows by layer</h3>
                <p className="card__subtitle">What each stage actually holds</p>
                <AsyncState
                  loading={loading}
                  error={error}
                  data={data}
                  skeleton={<SkeletonBlock rows={1} height={260} />}
                >
                  {() =>
                    chartData.length ? (
                      <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer>
                          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid {...GRID} />
                            <XAxis dataKey="name" {...AXIS} />
                            <YAxis {...AXIS} tickFormatter={formatCompact} width={48} />
                            <Tooltip
                              content={
                                <GlassTooltip formatter={formatCompact} />
                              }
                              cursor={{ fill: 'rgba(15,23,42,0.04)' }}
                            />
                            <Bar dataKey="rows" radius={[8, 8, 0, 0]} maxBarSize={70}>
                              {chartData.map((entry, i) => (
                                <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : null
                  }
                </AsyncState>
              </GlassCard>
            </Reveal>

            <Reveal delay={90}>
              <div className="stack">
                <GlassCard className="glass--pad">
                  <h3 className="card__title">Warehouse status</h3>
                  <p className="card__subtitle">Live from the catalog</p>
                  {totals.map((t) => (
                    <div className="stat" key={t.key}>
                      <span className="stat__value">
                        <CountUp value={t.rows} format={formatCompact} />
                      </span>
                      <span className="stat__label">
                        {t.key} · {t.objects} {t.objects === 1 ? 'object' : 'objects'}
                      </span>
                    </div>
                  ))}
                  {data?.silver?.duplicates_removed > 0 && (
                    <div className="stat">
                      <span className="stat__value">
                        <CountUp
                          value={data.silver.duplicates_removed}
                          format={formatCompact}
                        />
                      </span>
                      <span className="stat__label">duplicates removed</span>
                    </div>
                  )}
                </GlassCard>
                <PipelineStatus data={data} />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
