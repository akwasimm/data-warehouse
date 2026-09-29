/** Section header: number, title, one-line subtitle. The subtitle does the
 *  explaining so the body copy below can stay short. */
export default function SectionTitle({ children, subtitle, accent, id, num }) {
  return (
    <div className="sec__head">
      {num && (
        <span className="sec__num" style={{ color: accent }}>
          {String(num).padStart(2, '0')}
        </span>
      )}
      <div>
        <h2 className="section__title" id={id}>
          {children}
        </h2>
        {subtitle && <p className="section__sub">{subtitle}</p>}
      </div>
    </div>
  );
}
