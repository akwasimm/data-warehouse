import { useApi } from '../utils/api';
import { formatNumber } from '../utils/format';
import ScrollArrow from '../components/ScrollArrow';
import Reveal from '../components/Reveal';

const LAYERS = [
  { key: 'bronze', label: 'Bronze', letter: 'B', color: 'var(--bronze)' },
  { key: 'silver', label: 'Silver', letter: 'S', color: 'var(--silver)' },
  { key: 'gold', label: 'Gold', letter: 'G', color: 'var(--gold)' },
];

function HealthPill() {
  const { data, loading, error } = useApi('/health');
  if (loading) {
    return <span className="badge" aria-live="polite">Checking warehouse…</span>;
  }
  const ok = data?.status === 'ok';
  return (
    <span
      className="badge"
      title={error ? 'The API is not reachable' : `${data?.dialect} · ${data?.database_name}`}
      style={{
        color: ok ? 'var(--ok)' : 'var(--bad)',
        borderColor: ok ? 'rgba(21,128,61,0.3)' : 'rgba(185,28,28,0.3)',
      }}
    >
      <span aria-hidden="true">{ok ? '●' : '○'}</span>&nbsp;
      {ok ? `${data.dialect} · connected` : 'API offline'}
    </span>
  );
}

export default function Hero() {
  const { data } = useApi('/overview');

  return (
    <header className="section section--hero">
      <div className="section__inner" style={{ textAlign: 'center', position: 'relative' }}>
        <Reveal>
          <div style={{ marginBottom: '1.75rem' }}>
            <HealthPill />
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="hero__title">Wasim&apos;s Data Warehouse</h1>
          <p className="hero__subtitle">
            A three-layer medallion architecture over CRM and ERP data, queried live.
          </p>
        </Reveal>

        <Reveal delay={160}>
          <div className="medallion">
            {LAYERS.map((layer, i) => (
              <div key={layer.key} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <span className="medallion__link" aria-hidden="true" />}
                <div className="medallion__node">
                  <div className="medallion__ring" style={{ '--node-color': layer.color }}>
                    {layer.letter}
                  </div>
                  <span>{layer.label}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={240}>
          <p className="hero__body">
            Every figure on this page is a live query against the warehouse — no
            snapshots, no pre-computed tiles. Bronze holds the raw ingestion, silver
            holds the cleaned and typed truth, and gold holds the star schema the
            business actually reads.
          </p>
        </Reveal>

        <Reveal delay={320}>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: '2rem',
            }}
          >
            <a className="btn" href="#architecture">Architecture</a>
            <a className="btn" href="#gold">Analytics</a>
            {data?.gold?.total_rows != null && (
              <span className="badge" style={{ padding: '0.5rem 1rem' }}>
                {formatNumber(data.gold.total_rows)} rows in gold
              </span>
            )}
          </div>
        </Reveal>

        <ScrollArrow />
      </div>
    </header>
  );
}
