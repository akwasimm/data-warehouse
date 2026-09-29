import { useState } from 'react';
import {
  Area,
  AreaChart,
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
import { formatCompact, formatNumber } from '../utils/format';
import ChartWrapper from '../components/ChartWrapper';
import GlassCard from '../components/GlassCard';
import GlassTable, { previewColumns, previewRows } from '../components/GlassTable';
import KPICard from '../components/KPICard';
import Reveal from '../components/Reveal';
import SectionTitle from '../components/SectionTitle';
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
  revenue: { icon: '$', accent: 'var(--gold)' },
  customers: { icon: '☺', accent: 'var(--chart-3)' },
  orders: { icon: '▤', accent: 'var(--chart-1)' },
  avg_order_value: { icon: '≈', accent: 'var(--chart-2)' },
};

function Select({ id, label, value, options, onChange }) {
  return (
    <>
      <label className="controls__label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </>
  );
}

export default function GoldSection() {
  const kpis = useApi('/gold/kpis');
  const tables = useApi('/gold/tables');

  const [metric, setMetric] = useState('revenue');
  const [period, setPeriod] = useState('monthly');
  const [dimension, setDimension] = useState('category');
  const [entity, setEntity] = useState('product');

  const trend = useApi(`/gold/trend?metric=${metric}&period=${period}`);
  const distribution = useApi(`/gold/distribution?dimension=${dimension}&limit=8`);
  const top = useApi(`/gold/top-performers?entity=${entity}&metric=${metric}&limit=10`);

  return (
    <section className="section" id="gold">
      <div className="section__inner">
        <Reveal>
          <SectionTitle
            accent={ACCENT}
            id="gold-title"
            chapter="04"
            kicker="Where the numbers answer questions"
            lede={
              <>
                The star schema. <span className="mono">fact_sales</span> joined to{' '}
                <span className="mono">dim_customers</span> and{' '}
                <span className="mono">dim_products</span> — which is where every number
                on this page comes from.
              </>
            }
          >
            Gold
          </SectionTitle>
        </Reveal>

        <div className="stack">
          <div className="grid grid--4">
            <AsyncState
              loading={kpis.loading}
              error={kpis.error}
              data={kpis.data}
              skeleton={
                <div className="grid grid--4" style={{ gridColumn: '1 / -1' }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 118 }} />
                  ))}
                </div>
              }
            >
              {(d) =>
                d.kpis.map((kpi, i) => (
                  <Reveal key={kpi.key} delay={i * 70}>
                    <KPICard
                      label={kpi.label}
                      value={kpi.value}
                      trend={kpi.trend}
                      icon={KPI_STYLE[kpi.key]?.icon}
                      accent={KPI_STYLE[kpi.key]?.accent}
                    />
                  </Reveal>
                ))
              }
            </AsyncState>
          </div>

          {kpis.data && (
            <Reveal>
              <GoldFooterNote data={kpis.data} />
            </Reveal>
          )}

          <Reveal>
            <ChartWrapper
              title="Trend over time"
              subtitle="Aggregate by period across every dated fact row"
              accent={ACCENT}
              height={320}
              note={
                kpis.data?.period_range
                  ? `Covers ${kpis.data.period_range[0]} to ${kpis.data.period_range[1]}.`
                  : undefined
              }
              aside={
                <div className="controls" style={{ margin: 0 }}>
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
                      <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#A16207" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#A16207" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="period" {...AXIS} />
                        <YAxis {...AXIS} tickFormatter={formatCompact} width={52} />
                        <Tooltip
                          content={<GlassTooltip formatter={formatCompact} />}
                          cursor={{ stroke: 'rgba(15,23,42,0.15)' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          name={METRICS.find((m) => m.value === metric)?.label}
                          stroke="#A16207"
                          strokeWidth={2}
                          fill="url(#goldFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState title="No dated rows" hint="Every fact row is missing a date, so there is no trend to plot." />
                  )
                }
              </AsyncState>
            </ChartWrapper>
          </Reveal>

          <div className="grid grid--2">
            <Reveal>
              <ChartWrapper
                title="Revenue by dimension"
                subtitle="Fact table joined to its dimension view"
                accent={ACCENT}
                height={300}
                aside={
                  <div className="controls" style={{ margin: 0 }}>
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
                      <ResponsiveContainer>
                        <BarChart
                          data={rows}
                          layout="vertical"
                          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                        >
                          <CartesianGrid {...GRID} horizontal={false} vertical />
                          <XAxis type="number" {...AXIS} tickFormatter={formatCompact} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            {...AXIS}
                            width={104}
                            tickFormatter={(v) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
                          />
                          <Tooltip content={<GlassTooltip formatter={formatCompact} />} />
                          <Bar dataKey="value" name="Revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
                            {rows.map((_, i) => (
                              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState title="Nothing to group" />
                    )
                  }
                </AsyncState>
              </ChartWrapper>
            </Reveal>

            <Reveal delay={90}>
              <ChartWrapper
                title="Top performers"
                subtitle="Ranked, with share of the whole fact table"
                accent={ACCENT}
                height={300}
                aside={
                  <div className="controls" style={{ margin: 0 }}>
                    <Select id="top-entity" label="Entity" value={entity} options={ENTITIES} onChange={setEntity} />
                  </div>
                }
              >
                <AsyncState
                  loading={top.loading}
                  error={top.error}
                  data={top.data}
                  skeleton={<SkeletonBlock rows={6} height={32} />}
                >
                  {(rows) =>
                    rows.length ? (
                      <GlassTable
                        columns={[
                          { key: 'rank', label: '#', align: 'right' },
                          { key: 'name', label: 'Name' },
                          {
                            key: 'value',
                            label: METRICS.find((m) => m.value === metric)?.label ?? 'Value',
                            align: 'right',
                          },
                          {
                            key: 'percentage',
                            label: 'Share',
                            align: 'right',
                            render: (r) => `${r.percentage}%`,
                          },
                        ]}
                        rows={rows}
                        gold
                        highlightFirst
                      />
                    ) : (
                      <EmptyState title="No matching dimension rows" />
                    )
                  }
                </AsyncState>
              </ChartWrapper>
            </Reveal>
          </div>

          <Reveal>
            <FactBrowser tables={tables} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function GoldFooterNote({ data }) {
  const { undated, fact_view, fact_rows, trend_periods } = data;
  return (
    <div className="grid grid--3">
      <div className="stat" style={{ borderTop: 'none' }}>
        <span className="stat__value mono" style={{ fontSize: '1.05rem' }}>
          {fact_view ?? '—'}
        </span>
        <span className="stat__label">
          Fact view · {formatNumber(fact_rows)} line items
        </span>
      </div>
      <div className="stat" style={{ borderTop: 'none' }}>
        <span className="stat__value" style={{ fontSize: '1.05rem' }}>
          {undated?.rows ? formatNumber(undated.rows) : '0'}
        </span>
        <span className="stat__label">
          Rows with no order date
          {undated?.revenue ? ` · ${formatNumber(undated.revenue)} revenue excluded from the trend` : ''}
        </span>
      </div>
      <div className="stat" style={{ borderTop: 'none' }}>
        <span className="stat__value" style={{ fontSize: '1.05rem' }}>
          {trend_periods ? `${trend_periods[0]} → ${trend_periods[1]}` : '—'}
        </span>
        <span className="stat__label">Months behind the KPI trend arrows</span>
      </div>
    </div>
  );
}

const FACT_PAGE = 20;

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
    <GlassCard className="glass--pad">
      <h3 className="card__title">Browse gold</h3>
      <p className="card__subtitle">The fact table, page by page</p>

      <div className="controls">
        <label className="controls__label" htmlFor="gold-object">
          Object
        </label>
        <select
          id="gold-object"
          className="select"
          value={active ?? ''}
          onChange={(e) => {
            setName(e.target.value);
            setPage(1);
          }}
          disabled={!names.length}
        >
          {names.length ? (
            names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))
          ) : (
            <option value="">No gold objects found</option>
          )}
        </select>

        {total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <span className="badge">
              Page {page} of {pages} · {formatNumber(total)} rows
            </span>
            <button
              type="button"
              className="btn"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {preview.loading && <SkeletonBlock rows={8} height={30} />}
      {preview.error && <p className="state__hint">{preview.error}</p>}
      {preview.data && (
        <GlassTable
          columns={previewColumns(columns)}
          rows={previewRows(preview.data.rows, columns)}
          gold
          empty="No rows in this view"
        />
      )}
    </GlassCard>
  );
}
