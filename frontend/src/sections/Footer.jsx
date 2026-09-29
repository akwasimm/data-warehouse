import Logo from '../components/Logo';

const LAYERS = [
  { label: 'Bronze', color: 'var(--bronze)', note: 'raw' },
  { label: 'Silver', color: 'var(--silver)', note: 'clean' },
  { label: 'Gold', color: 'var(--gold)', note: 'serving' },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Logo size={30} />
          <p className="footer__line">
            Wasim&rsquo;s Data Warehouse
            <span className="footer__sub">SQL Server to PostgreSQL, rebuilt as a medallion pipeline.</span>
          </p>
        </div>

        <ul className="footer__layers">
          {LAYERS.map((l) => (
            <li key={l.label} className="footer__layer">
              <span className="footer__swatch" style={{ background: l.color }} aria-hidden="true" />
              {l.label}
              <span className="micro">{l.note}</span>
            </li>
          ))}
        </ul>

        <div className="footer__colophon">
          <span className="micro">FastAPI &middot; React &middot; Recharts</span>
          <a className="footer__top" href="#top">
            Back to top <span aria-hidden="true">&uarr;</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
