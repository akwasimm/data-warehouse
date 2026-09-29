import { formatCell } from '../utils/format';
import { EmptyState } from './States';

/**
 * Glass table. `columns` is [{ key, label, align?, render? }] where `key` is
 * either a property of the row or, for raw previews, a column index.
 */
export default function GlassTable({
  columns,
  rows,
  accent,
  gold = false,
  highlightFirst = false,
  empty = 'No rows',
}) {
  if (!rows?.length) return <EmptyState title={empty} />;

  const cellValue = (row, col) => (col.render ? col.render(row) : row[col.key]);

  return (
    <div className="table-wrap">
      <table
        className={`table${gold ? ' table--gold' : ''}${accent ? ' table--accent' : ''}`}
        style={accent ? { '--accent': accent } : undefined}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.label} className={col.align === 'right' ? 'num' : undefined} scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? row.key ?? i} className={highlightFirst && i === 0 ? 'is-top' : undefined}>
              {columns.map((col) => (
                <td key={col.label} className={col.align === 'right' ? 'num' : undefined}>
                  {formatCell(cellValue(row, col))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Raw preview shape: the API returns { columns: string[], rows: array[] }. */
export function previewColumns(names) {
  return names.map((name) => ({ key: name, label: name }));
}

export function previewRows(grid, names) {
  return grid.map((values) => Object.fromEntries(names.map((n, i) => [n, values[i]])));
}
