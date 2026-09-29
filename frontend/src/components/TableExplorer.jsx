import { useState } from 'react';
import { useApi } from '../utils/api';
import GlassTable, { previewColumns, previewRows } from './GlassTable';
import { SkeletonBlock } from './States';

const PAGE = 10;

/**
 * Table list + row preview for one medallion layer. Both bronze and silver use
 * this; the only difference is that silver also exposes a schema endpoint.
 */
export default function TableExplorer({ layer, accent, withSchema = false }) {
  const tables = useApi(`/${layer}/tables`);
  const [selected, setSelected] = useState(null);
  const [showSchema, setShowSchema] = useState(false);

  const names = (tables.data ?? []).map((t) => t.object_name);
  const active = selected && names.includes(selected) ? selected : names[0] ?? null;

  const preview = useApi(active ? `/${layer}/preview/${active}?limit=${PAGE}` : null, !active);
  const schema = useApi(
    withSchema && active && showSchema ? `/silver/schema/${active}` : null,
    !(withSchema && active && showSchema),
  );

  const columns = preview.data?.columns ?? [];
  const rows = preview.data?.rows ?? [];

  return (
    <div className="stack">
      <div className="controls">
        <label className="controls__label" htmlFor={`${layer}-table`}>
          Table
        </label>
        <select
          id={`${layer}-table`}
          className="select"
          value={active ?? ''}
          onChange={(e) => setSelected(e.target.value)}
          disabled={!names.length}
        >
          {names.length ? (
            names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))
          ) : (
            <option value="">No tables found</option>
          )}
        </select>

        {withSchema && active && (
          <button
            type="button"
            className="btn"
            onClick={() => setShowSchema((v) => !v)}
            aria-pressed={showSchema}
          >
            {showSchema ? 'Show rows' : 'Show schema'}
          </button>
        )}

        {active && (
          <span className="badge" style={{ marginLeft: 'auto' }}>
            {names.length} {names.length === 1 ? 'table' : 'tables'}
            {rows.length ? ` · showing ${rows.length}` : ''}
          </span>
        )}
      </div>

      <div className="glass glass--pad" style={{ padding: '0.9rem' }}>
        {tables.loading && <SkeletonBlock rows={4} height={38} />}

        {!tables.loading && tables.error && (
          <p className="state__hint" style={{ color: 'var(--text-secondary)' }}>
            Couldn&rsquo;t read the {layer} catalog: {tables.error}
          </p>
        )}

        {!tables.loading && !tables.error && !names.length && (
          <p className="state__hint" style={{ color: 'var(--text-secondary)' }}>
            No {layer} objects in the warehouse yet. Run the {layer} loaders, then reload —
            this panel reads straight from the catalog.
          </p>
        )}

        {showSchema ? (
          <>
            {schema.loading && <SkeletonBlock rows={5} height={30} />}
            {schema.data && (
              <GlassTable
                columns={[
                  { key: 'column_name', label: 'Column' },
                  { key: 'data_type', label: 'Type' },
                  { key: 'is_nullable', label: 'Nullable', render: (c) => (c.is_nullable ? 'yes' : 'no') },
                ]}
                rows={schema.data}
                accent={accent}
              />
            )}
          </>
        ) : (
          <>
            {preview.loading && <SkeletonBlock rows={5} height={34} />}
            {preview.error && (
              <p className="state__hint" style={{ color: 'var(--text-secondary)' }}>
                {preview.error}
              </p>
            )}
            {preview.data && (
              <GlassTable
                columns={previewColumns(columns)}
                rows={previewRows(rows, columns)}
                accent={accent}
                empty="No rows to preview"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
