import Logo from './Logo';

const SOCIALS = [
  { name: 'Kaggle', handle: 'akwasimm', href: 'https://www.kaggle.com/akwasimm', tone: '#20BEFF' },
  { name: 'GitHub', handle: 'akwasimm', href: 'https://github.com/akwasimm', tone: '#0F172A' },
  { name: 'LinkedIn', handle: 'akhterwasim', href: 'https://www.linkedin.com/in/akhterwasim', tone: '#0A66C2' },
];

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <a className="brandmark" href="#top">
          <Logo />
          <span className="brandmark__text">
            Wasim&rsquo;s
            <span className="brandmark__sub">Data Warehouse</span>
          </span>
        </a>

        <nav className="socials" aria-label="Elsewhere">
          {SOCIALS.map((s) => (
            <a
              key={s.name}
              className="social"
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`${s.name} profile, ${s.handle}`}
            >
              <span className="social__dot" style={{ background: s.tone }} aria-hidden="true" />
              <span className="social__name">{s.name}</span>
              <span className="social__handle">{s.handle}</span>
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
