/** Section heading with a coloured accent rule, so each medallion layer reads
 *  as its own band of the page. `chapter`/`kicker` add the narrative spine:
 *  numbered chapters make the page read top-to-bottom as a story rather than a
 *  stack of unrelated panels. */
export default function SectionTitle({ children, lede, accent, id, chapter, kicker }) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {chapter && (
        <p
          className="chapter"
          style={accent ? { '--chapter-accent': accent } : undefined}
        >
          <span className="chapter__num" aria-hidden="true">
            {chapter}
          </span>
          {kicker}
        </p>
      )}
      {accent && (
        <div
          style={{
            width: 36,
            height: 3,
            borderRadius: 2,
            background: accent,
            boxShadow: `0 2px 10px color-mix(in srgb, ${accent} 40%, transparent)`,
            marginBottom: '1.1rem',
          }}
        />
      )}
      <h2 className="section__title" id={id}>
        {children}
      </h2>
      {lede && <p className="section__lede">{lede}</p>}
    </div>
  );
}
