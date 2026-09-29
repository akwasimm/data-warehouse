export default function ScrollArrow({ targetId = 'architecture', label = 'Scroll' }) {
  return (
    <button
      type="button"
      className="scroll-arrow"
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
      aria-label="Scroll to the architecture overview"
    >
      <span>{label}</span>
      <svg
        className="scroll-arrow__chevron"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
    </button>
  );
}
