/** Loading shimmer / soft error / empty — the three states a data card can be in. */
export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}

export function SkeletonBlock({ rows = 3, height = 44 }) {
  return (
    <div className="stack" style={{ gap: '0.75rem' }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="state" role="status">
      <span className="state__title">Couldn&rsquo;t load this</span>
      <span className="state__hint">{message}</span>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', hint }) {
  return (
    <div className="state">
      <span className="state__title">{title}</span>
      {hint && <span className="state__hint">{hint}</span>}
    </div>
  );
}

/** Pick the right state for a useApi result. Keeps it out of every section. */
export function AsyncState({ loading, error, data, skeleton = <SkeletonBlock />, children }) {
  if (loading) return skeleton;
  if (error) return <ErrorState message={error} />;
  if (data == null) return null;
  return children(data);
}
