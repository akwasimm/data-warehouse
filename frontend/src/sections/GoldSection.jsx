import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApi } from '../utils/api';
import { ANIM, AXIS, GRID, PALETTE } from '../utils/chartTheme';
import GlassTooltip from '../components/GlassTooltip';
import { formatCompact, formatNumber } from '../utils/format';
import ChartWrapper from '../components/ChartWrapper';
import GlassCard from '../components/GlassCard';
import GlassTable, { previewColumns, previewRows } from '../components/GlassTable';
import KPICard from '../components/KPICard';
import Reveal from '../components/Reveal';
import SectionTitle from '../components/SectionTitle';
import Select from '../components/Select';
import { AsyncState, EmptyState, SkeletonBlock } from '../components/States';

const ACCENT = 'var(--gold)';

const METRICS = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'orders', label: 'Orders' },
  { value: 'quantity', label: 'Quantity' },
];

const DIMENSIONS = [
  { value: 'category', label: 'Product category' },
  { value: 'subcategory', label: 'Subcategory' },
  { value: 'product_line', label: 'Product line' },
  { value: 'country', label: 'Customer country' },
  { value: 'gender', label: 'Gender' },
  { value: 'marital_status', label: 'Marital status' },
];

const ENTITIES = [
  { value: 'product', label: 'Products' },
  { value: 'customer', label: 'Customers' },
  { value: 'country', label: 'Countries' },
];

const KPI_STYLE = {
  revenue: { accent: 'var(--gold)' },
  customers: { accent: 'var(--chart-3)' },
  orders: { accent: 'var(--chart-1)' },
  avg_order_value: { accent: 'var(--chart-2)' },
};

const TOP_LIMIT = 5;
const TOP_ALL = 10;
const FACT_PAGE = 15;

function DonutLegend({ rows, total }) {
  return (
    <ul className="donut__legend" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rows.map((r, i) => (
        <li className="donut__row" key={r.name}>
          <span className="dot" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden="true" />
          <span title={r.name}>{r.name}</span>
          <b>{total ? `${((r.value / total) * 100).toFixed(1)}%` : '—'}</b>
        </li>
      ))}
    </ul>
  );
}

export default function GoldSection() {
  const kpis = useApi('/gold/kpis');
  const tables = useApi('/gold/tables');

  const [metric, setMetric] = useState('revenue');
  const [period, setPeriod] = useState('monthly');
  const [dimension, setDimension] = useState('category');
  const [entity, setEntity] = useState('product');
  const [showAllTop, setShowAllTop] = useState(false);

  const trend = useApi(`/gold/trend?metric=${metric}&period=${period}`);
  const distribution = useApi(`/gold/distribution?dimension=${dimension}&limit=8`);
  const top = useApi(`/gold/top-performers?entity=${entity}&metric=${metric}&limit=${TOP_ALL}`);

  const metricLabel = METRICS.find((m) => m.value === metric)?.label ?? 'Value';
  const donutTotal = (distribution.data ?? []).reduce((sum, r) => sum + r.value, 0);
  const topRows = showAllTop ? (top.data ?? []) : (top.data ?? []).slice(0, TOP_LIMIT);

  return (
    <section className="section" id="gold">
      <div className="section__inner">
        <Reveal>
          <SectionTitle num={4} id="gold-title" accent={ACCENT} subtitle="Business-ready metrics.">
            Gold layer
          </SectionTitle>
        </Reveal>

        <div className="stack" style={{ gap: 'var(--space-card)' }}>
          <div className="grid grid--4">
            <AsyncState
              loading={kpis.loading}
              error={kpis.error}
              data={kpis.data}
              skeleton={
                <div className="grid grid--4" style={{ gridColumn: '1 / -1' }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 100 }} />
                  ))}
                </div>
              }
            >
              {(d) =>
                d.kpis.map((kpi, i) => (
                  <Reveal key={kpi.key} delay={i * 100}>
                    <KPICard
                      compact
                      label={kpi.label}
                      value={kpi.value}
                      trend={kpi.trend}
                      accent={KPI_STYLE[kpi.key]?.accent}
                    />
                  </Reveal>
                ))
              }
            </AsyncState>
          </div>

          {kpis.data && (
            <Reveal delay={100}>
              <div className="grid grid--strip">
                <GlassCard className="glass--pad statcard glass--sm">
                  <span className="statcard__value mono" style={{ fontSize: '0.85rem' }}>
                    {kpis.data.fact_view ?? '—'}
                  </span>
                  <span className="statcard__label">Fact view</span>
                </GlassCard>
                <GlassCard className="glass--pad statcard glass--sm">
                  <span className="statcard__value">
                    {formatNumber(kpis.data.undated?.rows ?? 0)}
                  </span>
                  <span className="statcard__label">Rows with no order date</span>
                </GlassCard>
                <GlassCard className="glass--pad statcard glass--sm">
                  <span className="statcard__value">
                    {kpis.data.trend_periods
                      ? `${kpis.data.trend_periods[0]} → ${kpis.data.trend_periods[1]}`
                      : '—'}
                  </span>
                  <span className="statcard__label">Months behind the trend arrows</span>
                </GlassCard>
              </div>
            </Reveal>
          )}

          <div className="grid grid--charts">
            <ChartWrapper
              title="Revenue over time"
              subtitle={metricLabel}
              accent={ACCENT}
              height={350}
              aside={
                <div className="controls">
                  <Select id="trend-metric" label="Metric" value={metric} options={METRICS} onChange={setMetric} />
                  <Select
                    id="trend-period"
                    label="By"
                    value={period}
                    options={[
                      { value: 'monthly', label: 'Month' },
                      { value: 'yearly', label: 'Year' },
                    ]}
                    onChange={setPeriod}
                  />
                </div>
              }
              note={
                kpis.data?.period_range
                  ? `Covers ${kpis.data.period_range[0]} to ${kpis.data.period_range[1]}.`
                  : undefined
              }
            >
              <AsyncState
                loading={trend.loading}
                error={trend.error}
                data={trend.data}
                skeleton={<div className="skeleton" style={{ height: '100%' }} />}
              >
                {(rows) =>
                  rows.length ? (
                    <ResponsiveContainer>
                      <AreaChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#A16207" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#A16207" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="period" {...AXIS} />
                        <YAxis {...AXIS} tickFormatter={formatCompact} width={52} />
                        <Tooltip content={<GlassTooltip formatter={formatCompact} />} cursor={{ stroke: 'rgba(15,23,42,0.15)' }} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          name={metricLabel}
                          stroke="#A16207"
                          strokeWidth={2}
                          fill="url(#goldFill)"
                          isAnimationActive
                          animationDuration={ANIM}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState title="No dated rows" hint="Every fact row is missing a date, so there is no trend to plot." />
                  )
                }
              </AsyncState>
            </ChartWrapper>

            <ChartWrapper
              title="Share by dimension"
              subtitle={DIMENSIONS.find((d) => d.value === dimension)?.label}
              accent={ACCENT}
              height={350}
              aside={
                <div className="controls">
                  <Select id="dist-dim" label="By" value={dimension} options={DIMENSIONS} onChange={setDimension} />
                </div>
              }
            >
              <AsyncState
                loading={distribution.loading}
                error={distribution.error}
                data={distribution.data}
                skeleton={<div className="skeleton" style={{ height: '100%' }} />}
              >
                {(rows) =>
                  rows.length ? (
                    <div className="donut">
                      <div style={{ width: 150, height: 200, flexShrink: 0 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={rows}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={44}
                              outerRadius={68}
                              paddingAngle={2}
                              stroke="none"
                              isAnimationActive
                              animationDuration={ANIM}
                            >
                              {rows.map((entry, i) => (
                                <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<GlassTooltip formatter={formatCompact} />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <DonutLegend rows={rows} total={donutTotal} />
                    </div>
                  ) : (
                    <EmptyState title="Nothing to group" />
                  )
                }
              </AsyncState>
            </ChartWrapper>
          </div>

          <Reveal delay={0}>
            <GlassCard className="glass--pad-lg">
              <div className="cardhead">
                <div>
                  <h3 className="card__title" style={{ color: ACCENT }}>Top performers</h3>
                  <p className="card__text">
                    Ranked by {metricLabel.toLowerCase()}, share of the whole fact table.
                  </p>
                </div>
                <div className="card__corner">
                  <div className="controls">
                    <Select id="top-entity" label="Entity" value={entity} options={ENTITIES} onChange={setEntity} />
                    <button
                      type="button"
                      className="viewall"
                      onClick={() => setShowAllTop((v) => !v)}
                      aria-expanded={showAllTop}
                    >
                      {showAllTop ? 'Show top 5' : 'View all →'}
                    </button>
                  </div>
                </div>
              </div>
              <AsyncState
                loading={top.loading}
                error={top.error}
                data={top.data}
                skeleton={<SkeletonBlock rows={TOP_LIMIT} height={30} />}
              >
                {(rows) =>
                  rows.length ? (
                    <GlassTable
                      columns={[
                        { key: 'rank', label: '#', align: 'right' },
                        { key: 'name', label: 'Name' },
                        { key: 'value', label: metricLabel, align: 'right' },
                        { key: 'percentage', label: '% total', align: 'right', render: (r) => `${r.percentage}%` },
                      ]}
                      rows={topRows}
                      gold
                      highlightFirst
                    />
                  ) : (
                    <EmptyState title="No matching dimension rows" />
                  )
                }
              </AsyncState>
            </GlassCard>
          </Reveal>

          <Reveal delay={100}>
            <FactBrowser tables={tables} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FactBrowser({ tables }) {
  const names = (tables.data ?? []).map((t) => t.object_name);
  const [name, setName] = useState(null);
  const [page, setPage] = useState(1);

  const active = name && names.includes(name) ? name : names.find((n) => n.startsWith('fact')) ?? names[0] ?? null;
  const preview = useApi(
    active ? `/gold/preview/${active}?page=${page}&limit=${FACT_PAGE}` : null,
    !active,
  );

  const total = preview.data?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / FACT_PAGE));
  const columns = preview.data?.columns ?? [];

  return (
    <GlassCard className="glass--pad-lg">
      <div className="cardhead">
        <div>
          <h3 className="card__title" style={{ color: ACCENT }}>Gold fact table</h3>
          <p className="card__text">Page through the fact rows the dashboard queries.</p>
        </div>
        <div className="card__corner">
          <div className="controls">
            <Select
              id="gold-object"
              label="Object"
              value={active ?? ''}
              options={names.length ? names : [{ value: '', label: 'No gold objects found' }]}
              onChange={(v) => {
                setName(v);
                setPage(1);
              }}
              disabled={!names.length}
            />
          </div>
        </div>
      </div>

      {preview.loading && <SkeletonBlock rows={FACT_PAGE} height={28} />}
      {preview.error && <p className="state__hint">{preview.error}</p>}
      {preview.data && (
        <GlassTable
          columns={previewColumns(columns)}
          rows={previewRows(preview.data.rows, columns)}
          gold
          empty="No rows in this view"
        />
      )}

      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Prev
          </button>
          <span className="micro">Page {page} of {pages} · {formatNumber(total)} rows</span>
          <button
            type="button"
            className="btn"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
          >
            Next →
          </button>
        </div>
      )}
    </GlassCard>
  );
}
