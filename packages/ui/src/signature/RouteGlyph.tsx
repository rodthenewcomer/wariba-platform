import { cx } from '../lib/cx';

export type RouteGlyphFamily = 'one' | 'flex' | 'instant';

export interface RouteGlyphProps {
  family: RouteGlyphFamily;
  size?: number;
  className?: string;
}

/**
 * The three product families, as mini identities — Phase 3.4.5A §21, §36.
 *
 * ## What these are, and what they are deliberately not
 *
 * They are the smallest possible mark that makes ONE, FLEX and INSTANT
 * recognisably different from each other *inside* one brand. A mega-menu with
 * three text links and a chevron is a dropdown; three links each carrying its
 * own object is a product menu.
 *
 * They are **not** the final assets. `OneTargetReactor`, `FlexBridge` and
 * `InstantPortal` — the full metal-and-light objects — belong to phases B–N
 * where the pages that need them are built. These are ~600 bytes of SVG each:
 * a ring, a span, a core. Shipping the cinematic versions in the shell would
 * put them on the LCP path of every public route to decorate a menu item.
 *
 * ## Why all three stay cobalt
 *
 * The family shift is along the cobalt scale, never off it: ONE is the pure
 * accent, FLEX drifts to the indigo it owns, INSTANT carries a cyan edge. A
 * green INSTANT glyph would read as a second brand, and the entire point of
 * the shell is that a blurred screenshot still says WARIBA.
 */
export function RouteGlyph({ family, size = 40, className }: RouteGlyphProps) {
  const tint = TINT[family];
  const id = `wrg-${family}`;

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      className={cx('block shrink-0', className)}
    >
      <defs>
        <radialGradient id={`${id}-pool`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={tint} stopOpacity="0.55" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* The tile every glyph sits on, so the three read as one set. */}
      <rect x="0.5" y="0.5" width="39" height="39" rx="11" fill="#12161F" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="11" stroke={tint} strokeOpacity="0.34" />
      <circle cx="20" cy="26" r="15" fill={`url(#${id}-pool)`} />

      {family === 'one' ? (
        /* A target: concentric rings closing on a centre. Proof, precision. */
        <g stroke={tint} strokeWidth="1.6" fill="none">
          <circle cx="20" cy="20" r="10.5" strokeOpacity="0.4" />
          <circle cx="20" cy="20" r="6.5" strokeOpacity="0.7" />
          <circle cx="20" cy="20" r="2.4" fill={tint} stroke="none" />
        </g>
      ) : null}

      {family === 'flex' ? (
        /*
         * A crossing: two nodes, a lit span, one point in the middle.
         *
         * The first version drew two filled rounded piers under an arch and at
         * 44px it read unmistakably as a pair of headphones. Thin vertical
         * stems and a flatter span remove the ear-cup silhouette and leave the
         * thing the glyph is actually about — getting from here to there, with
         * a marked step on the way.
         */
        <g fill="none" strokeLinecap="round">
          <path d="M11 27.5V21M29 27.5V21" stroke={tint} strokeOpacity="0.55" strokeWidth="1.6" />
          <circle cx="11" cy="19" r="2.3" fill={tint} fillOpacity="0.85" />
          <circle cx="29" cy="19" r="2.3" fill={tint} fillOpacity="0.85" />
          <path d="M11 19 C 15 12.5, 25 12.5, 29 19" stroke={tint} strokeWidth="1.9" />
          <circle cx="20" cy="14.6" r="2.6" fill={tint} />
        </g>
      ) : null}

      {family === 'instant' ? (
        /* A portal: an aperture with a lit core. Direct access. */
        <g fill="none">
          <rect
            x="9"
            y="9"
            width="22"
            height="22"
            rx="7"
            stroke={tint}
            strokeOpacity="0.5"
            strokeWidth="1.5"
          />
          <rect
            x="14"
            y="14"
            width="12"
            height="12"
            rx="4"
            stroke={tint}
            strokeOpacity="0.85"
            strokeWidth="1.5"
          />
          <circle cx="20" cy="20" r="2.6" fill={tint} />
        </g>
      ) : null}
    </svg>
  );
}

const TINT: Record<RouteGlyphFamily, string> = {
  one: '#4C74FF',
  flex: '#7C6BFF',
  instant: '#3FB8C4',
};
