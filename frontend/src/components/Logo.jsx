/* The mark is the pipeline in miniature: three stacked cylinders, one per
   medallion layer, with a report sheet riding on top. Same geometry as the
   hero art so the brand reads as one drawing at two sizes. */
export default function Logo({ size = 26 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g fill="none" strokeWidth="1.6" strokeLinecap="round">
        <path d="M6 8 v4 a5 2.2 0 0 0 10 0 V8" fill="rgba(180,83,9,0.16)" stroke="#B45309" />
        <ellipse cx="11" cy="8" rx="5" ry="2.2" fill="rgba(180,83,9,0.34)" stroke="#B45309" />
        <path d="M6 16 v4 a5 2.2 0 0 0 10 0 v-4" fill="rgba(100,116,139,0.16)" stroke="#64748B" />
        <ellipse cx="11" cy="16" rx="5" ry="2.2" fill="rgba(100,116,139,0.34)" stroke="#64748B" />
        <path d="M6 24 v4 a5 2.2 0 0 0 10 0 v-4" fill="rgba(161,98,7,0.16)" stroke="#A16207" />
        <ellipse cx="11" cy="24" rx="5" ry="2.2" fill="rgba(161,98,7,0.34)" stroke="#A16207" />
      </g>
      <path
        d="M20 4 h6 l3 3 v8 h-9 Z"
        fill="rgba(255,255,255,0.9)"
        stroke="rgba(15,23,42,0.34)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M26 4 v3 h3" fill="none" stroke="rgba(15,23,42,0.34)" strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="22" y1="10" x2="27" y2="10" stroke="rgba(15,23,42,0.3)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="22" y1="12.5" x2="25" y2="12.5" stroke="rgba(15,23,42,0.3)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
