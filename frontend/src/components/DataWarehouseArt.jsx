/* The medallion pipeline as a drawing that assembles itself: files land, get
   drawn into one raw cylinder, clone into the three layers, build a warehouse,
   and resolve into a report. Pure SVG + CSS so it inherits the theme tokens,
   costs no image request, and collapses to its final state when motion is off. */

const FILE_X = 26;
const FILE_W = 46;
const FILE_H = 30;
const FUNNEL = { x: 180, y: 150 };

/* A cylinder is a body path plus a lid ellipse. Drawn once, reused five times
   instead of hand-writing ten paths. */
function Cylinder({ cx, cy, w, h, ry = 8, tone = 'ink', opacity = 1 }) {
  const rx = w / 2;
  const l = cx - rx;
  return (
    <g opacity={opacity}>
      <path
        d={`M${l} ${cy} v${h} a${rx} ${ry} 0 0 0 ${w} 0 v${-h} Z`}
        fill={`var(--dwa-${tone}-fill)`}
        stroke={`var(--dwa-${tone}-line)`}
        strokeWidth="1.5"
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={`var(--dwa-${tone}-lid)`}
        stroke={`var(--dwa-${tone}-line)`}
        strokeWidth="1.5"
      />
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx * 0.55}
        ry={ry * 0.55}
        fill="none"
        stroke={`var(--dwa-${tone}-line)`}
        strokeWidth="1"
        opacity="0.5"
      />
    </g>
  );
}

function File({ y, delay }) {
  // where this file has to travel to reach the funnel mouth at (180, 150)
  const dx = FUNNEL.x - (FILE_X + FILE_W / 2);
  const dy = FUNNEL.y - (y + FILE_H / 2);
  const lines = [0, 1, 2].map((i) => (
    <line
      key={i}
      x1={FILE_X + 8}
      y1={y + 10 + i * 6}
      x2={FILE_X + FILE_W - 8 - (i === 2 ? 10 : 0)}
      y2={y + 10 + i * 6}
      stroke="var(--dwa-ink-line)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.55"
    />
  ));
  return (
    <g className="dwa-file" style={{ '--d': `${delay}s`, '--dx': `${dx}px`, '--dy': `${dy}px` }}>
      <rect
        x={FILE_X}
        y={y}
        width={FILE_W}
        height={FILE_H}
        rx="5"
        fill="var(--dwa-paper)"
        stroke="var(--dwa-ink-line)"
        strokeWidth="1.5"
      />
      {lines}
    </g>
  );
}

export default function DataWarehouseArt() {
  const layers = [
    { cx: 92, tone: 'bronze' },
    { cx: 180, tone: 'silver' },
    { cx: 268, tone: 'gold' },
  ];

  return (
    <svg
      className="dwa"
      viewBox="0 0 360 480"
      role="img"
      aria-label="Animated diagram: source files flow into a raw data cylinder, clone into the bronze, silver and gold layers, form a warehouse, and resolve into a report"
    >
      {/* 1. source files */}
      {[8, 46, 84].map((y, i) => (
        <File key={y} y={y} delay={0.15 + i * 0.3} />
      ))}

      {/* 2. they converge on the funnel mouth */}
      <path
        className="dwa-link dwa-link--in"
        style={{ '--d': '1.9s' }}
        d={`M${FUNNEL.x - 26} 118 L${FUNNEL.x} ${FUNNEL.y} L${FUNNEL.x + 26} 118`}
        fill="none"
        stroke="var(--dwa-ink-line)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 4"
        opacity="0.5"
      />

      {/* 3. raw cylinder */}
      <g className="dwa-cyl-raw" style={{ '--d': '2.6s' }}>
        <Cylinder cx={180} cy={160} w={104} h={50} />
      </g>

      {/* 4. split into the three layers */}
      <path
        className="dwa-link dwa-link--out"
        style={{ '--d': '3.3s' }}
        d="M180 216 L180 232 M92 244 L92 232 L268 244 L268 232"
        fill="none"
        stroke="var(--dwa-ink-line)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 4"
        opacity="0.5"
      />
      {layers.map((l, i) => (
        <g key={l.tone} className="dwa-layer" style={{ '--d': `${3.6 + i * 0.22}s` }}>
          <Cylinder cx={l.cx} cy={250} w={66} h={38} ry={7} tone={l.tone} />
        </g>
      ))}

      {/* 5. the warehouse they become */}
      <g className="dwa-ware" style={{ '--d': '4.8s' }}>
        <path
          className="dwa-link dwa-link--roof"
          style={{ '--d': '4.8s' }}
          d="M180 292 L180 316"
          fill="none"
          stroke="var(--dwa-ink-line)"
          strokeWidth="1.5"
          strokeDasharray="3 4"
          opacity="0.5"
        />
        <path d="M100 352 L100 348 L180 314 L260 348 L260 352 Z" fill="var(--dwa-ink-fill)" stroke="var(--dwa-ink-line)" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="100" y="352" width="160" height="54" rx="3" fill="var(--dwa-paper)" stroke="var(--dwa-ink-line)" strokeWidth="1.5" />
        <rect x="118" y="368" width="26" height="20" rx="2" fill="var(--dwa-ink-fill)" stroke="var(--dwa-ink-line)" strokeWidth="1.2" />
        <rect x="154" y="368" width="26" height="20" rx="2" fill="var(--dwa-ink-fill)" stroke="var(--dwa-ink-line)" strokeWidth="1.2" />
        <rect x="190" y="368" width="26" height="20" rx="2" fill="var(--dwa-ink-fill)" stroke="var(--dwa-ink-line)" strokeWidth="1.2" />
        <rect x="168" y="374" width="24" height="32" rx="2" fill="var(--dwa-paper)" stroke="var(--dwa-ink-line)" strokeWidth="1.2" />
      </g>

      {/* 6. warehouse becomes a curated cylinder */}
      <g className="dwa-cyl-final" style={{ '--d': '6s' }}>
        <Cylinder cx={180} cy={366} w={124} h={56} ry={10} />
      </g>

      {/* 7. and the report comes out */}
      <g className="dwa-paper" style={{ '--d': '6.7s' }}>
        <path
          d="M152 424 h44 l14 14 v30 h-58 Z"
          fill="var(--dwa-paper)"
          stroke="var(--dwa-ink-line)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M196 424 v14 h14" fill="none" stroke="var(--dwa-ink-line)" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="162" y1="440" x2="192" y2="440" stroke="var(--dwa-ink-line)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <line x1="162" y1="448" x2="200" y2="448" stroke="var(--dwa-ink-line)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <line x1="162" y1="456" x2="184" y2="456" stroke="var(--dwa-ink-line)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </g>
    </svg>
  );
}
