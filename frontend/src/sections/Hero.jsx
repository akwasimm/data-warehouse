import DataWarehouseArt from '../components/DataWarehouseArt';
import Reveal from '../components/Reveal';
import ScrollArrow from '../components/ScrollArrow';

const LAYERS = [
  { label: 'Bronze', color: 'var(--bronze)' },
  { label: 'Silver', color: 'var(--silver)' },
  { label: 'Gold', color: 'var(--gold)' },
];

export default function Hero() {
  return (
    <div className="section section--hero">
      <div className="hero">
        <div className="hero__inner">
          <Reveal>
            <h1 className="hero__title">Wasim&rsquo;s</h1>
            <p className="hero__subtitle">Data Warehouse</p>
          </Reveal>

          <Reveal delay={100}>
            <div className="hero__rule" />
          </Reveal>

          <Reveal delay={200}>
            <p className="hero__body">
              A SQL Server estate rebuilt as a three-layer medallion pipeline on PostgreSQL. Source
              tables land untouched in Bronze, where nothing is filtered or renamed. Silver types
              every column, repairs what is broken and drops the duplicate customer records that
              would have skewed every count downstream. Gold joins what survives into a single fact
              table &mdash; the only thing this dashboard reads from.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <p className="hero__note">
              Every figure below is computed live from that one table, so the row counts, the
              revenue trend and the leaderboards can never disagree with each other.
            </p>
          </Reveal>

          <Reveal delay={400}>
            <div className="pills">
              {LAYERS.map((layer) => (
                <span
                  key={layer.label}
                  className="pill"
                  style={{ color: layer.color, borderColor: `color-mix(in srgb, ${layer.color} 40%, transparent)` }}
                >
                  <span className="pill__dot" style={{ background: layer.color }} aria-hidden="true" />
                  {layer.label}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="hero__art">
          <DataWarehouseArt />
        </div>
      </div>

      <ScrollArrow />
    </div>
  );
}
