export const AXIS = {
  stroke: 'rgba(15,23,42,0.45)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

// Horizontal only, dashed, very faint. Vertical grid lines on a light surface
// read as a table grid and fight the data.
export const GRID = {
  stroke: 'rgba(15,23,42,0.07)',
  strokeDasharray: '3 3',
  vertical: false,
};

export const PALETTE = [
  '#4F46E5',
  '#E11D48',
  '#0891B2',
  '#DB2777',
  '#2563EB',
  '#7C3AED',
];

// Every chart animates at the same speed so switching a control doesn't feel
// like loading a different page.
export const ANIM = 800;

export const tooltipStyle = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid rgba(15,23,42,0.10)',
  borderRadius: 12,
  boxShadow: '0 8px 32px rgba(15,23,42,0.12)',
  fontSize: 12,
};

export const tooltipLabelStyle = {
  color: 'rgba(15,23,42,0.55)',
  marginBottom: 4,
};

export const tooltipItemStyle = { color: '#0F172A' };
