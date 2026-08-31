/**
 * An SVG path that draws itself.
 *
 * Pure CSS, for the same reason `Reveal` is: a dash offset applied by
 * JavaScript is a line that never appears when the bundle does not. The
 * animation is `forwards`, so its resting state is the complete path — which
 * is also what a browser with animations disabled, or a reader with reduced
 * motion, sees immediately.
 *
 * `length` only has to be an over-estimate of the real path length. Too large
 * simply means the line starts further off-screen; too small would clip it,
 * so the defaults err high.
 */
export function DrawPath({
  d,
  stroke = 'currentColor',
  strokeWidth = 2,
  length = 600,
  duration = 0.9,
  delay = 0,
  className,
}: {
  d: string;
  stroke?: string;
  strokeWidth?: number;
  length?: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`wariba-draw ${className ?? ''}`}
      style={{
        strokeDasharray: length,
        ['--wariba-draw-length' as string]: `${length}`,
        ['--wariba-draw-duration' as string]: `${duration}s`,
        ['--wariba-draw-delay' as string]: `${delay}s`,
      }}
    />
  );
}
