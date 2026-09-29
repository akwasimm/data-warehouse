export default function ScrollArrow({ targetId = 'architecture', label = 'Scroll' }) {
  return (
    <button
      type="button"
      className="scroll-cue"
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
    >
      <span className="scroll-cue__stack">
        <span className="scroll-cue__label">{label}</span>
        {/* three identical waves, offset by one wavelength, marching upward */}
        <svg className="scroll-cue__wave" viewBox="0 0 60 15" aria-hidden="true">
          <path d="M0 7.5 Q7.5 0 15 7.5 T30 7.5 T45 7.5 T60 7.5" />
          <path d="M0 7.5 Q7.5 0 15 7.5 T30 7.5 T45 7.5 T60 7.5" />
          <path d="M0 7.5 Q7.5 0 15 7.5 T30 7.5 T45 7.5 T60 7.5" />
        </svg>
        <svg className="scroll-cue__chevron" viewBox="0 0 24 14" aria-hidden="true">
          <polyline points="4,3 12,11 20,3" />
        </svg>
      </span>
    </button>
  );
}
