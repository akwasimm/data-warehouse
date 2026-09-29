import { useApi } from '../utils/api';
import Reveal from '../components/Reveal';

export default function Footer() {
  const health = useApi('/health');

  return (
    <footer className="footer">
      <Reveal>
        <p className="footer__title" style={{ fontSize: '0.95rem', fontWeight: 500 }}>
          Wasim&apos;s Data Warehouse
        </p>
        <p>
          A medallion architecture in PostgreSQL — bronze, silver, and gold, queried
          live on every page load.
        </p>
        <p>
          {health.data?.database_name
            ? `Connected to ${health.data.database_name} · ${health.data.dialect}`
            : 'Backend unreachable'}
          {health.data?.status === 'ok' ? ' · all systems nominal' : ''}
        </p>
        <p style={{ marginTop: '1.25rem', opacity: 0.75 }}>
          Public dashboard · no authentication · read-only queries only
        </p>
      </Reveal>
    </footer>
  );
}
