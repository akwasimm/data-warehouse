import { tooltipItemStyle, tooltipLabelStyle, tooltipStyle } from '../utils/chartTheme';

/** Glass tooltip that formats numbers the way the rest of the page does.
 *  Passed as `<Tooltip content={<GlassTooltip formatter={formatCompact} />} />`. */
export default function GlassTooltip({ formatter, labelFormatter }) {
  return function Tooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
      <div style={tooltipStyle}>
        {label != null && (
          <div style={tooltipLabelStyle}>{labelFormatter ? labelFormatter(label) : label}</div>
        )}
        {payload.map((entry) => (
          <div
            key={entry.dataKey ?? entry.name}
            style={{ ...tooltipItemStyle, display: 'flex', gap: 10, justifyContent: 'space-between' }}
          >
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  marginRight: 6,
                  background: entry.color ?? entry.payload?.fill,
                }}
              />
              {entry.name}
            </span>
            <strong>{formatter ? formatter(entry.value, entry) : entry.value}</strong>
          </div>
        ))}
      </div>
    );
  };
}
