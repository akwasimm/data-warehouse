/** Glass surface. `interactive` adds the hover lift, `accent` tints the border. */
export default function GlassCard({
  children,
  interactive = false,
  accent,
  className = '',
  style,
  ...rest
}) {
  const classes = [
    'glass',
    interactive ? 'glass--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={accent ? { borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`, ...style } : style}
      {...rest}
    >
      {children}
    </div>
  );
}
