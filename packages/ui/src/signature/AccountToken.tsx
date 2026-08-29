import { cx } from '../lib/cx';

export type AccountTokenFamily = 'one' | 'flex' | 'instant' | 'neutral';

export interface AccountTokenProps {
  /** `5K`, `10K`, `25K`, `50K`, `100K` — rendered as the plate's outlined numeral. */
  sizeCode: string;
  family?: AccountTokenFamily;
  /** Rendered width. The plate keeps a 4:3 ratio. */
  width?: number;
  className?: string;
}

/**
 * The WARIBA account plate.
 *
 * ## Why this object exists
 *
 * A pricing card without an object is a table row with a button on it. The
 * benchmark's strongest commerce pages (references 05, 12, 16) all put a
 * manufactured-looking plate above the price, and that single element is what
 * turns "an amount and three bullets" into a product.
 *
 * ## How the metal is made
 *
 * Four layers, no image, no WebGL, ~2KB of markup:
 *
 * 1. **The bevel** — a linear gradient across the outer plate, lightest at the
 *    top-left corner and darkest at the bottom-right. This alone reads as a
 *    chamfered edge.
 * 2. **The inset face** — a near-black rounded rect sitting 7% inside the
 *    bevel, with a faint radial lift so the centre is not a flat block.
 * 3. **The specular liner** — a bright, short, horizontal bar tucked against
 *    the *bottom* inner edge. This is the detail that does the work. Without
 *    it the plate looks like a dark rectangle with a grey border; with it, it
 *    looks like a solid object photographed under a studio light. Every
 *    reference plate has it and it is the easiest thing to leave out.
 * 4. **The numeral, outlined** — stroke, no fill. A filled numeral reads as a
 *    badge; an outlined one reads as engraved.
 *
 * The light is cobalt rather than neutral chrome, which is what keeps the
 * object WARIBA's rather than a generic metal render.
 *
 * ## Ids
 *
 * Gradient ids are derived from `sizeCode` and `family` rather than `useId`,
 * so this stays a Server Component. Two plates with the same size and family
 * on one page share a definition — they are pixel-identical, so the collision
 * is invisible by construction.
 */
export function AccountToken({
  sizeCode,
  family = 'neutral',
  width = 240,
  className,
}: AccountTokenProps) {
  const key = `${family}-${sizeCode}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const bevel = `wat-bevel-${key}`;
  const face = `wat-face-${key}`;
  const spec = `wat-spec-${key}`;
  const rim = `wat-rim-${key}`;
  const pool = `wat-pool-${key}`;

  const glow = FAMILY_GLOW[family];

  return (
    <svg
      viewBox="0 0 240 180"
      width={width}
      height={(width * 180) / 240}
      role="img"
      aria-label={`Compte simulé de ${sizeCode}`}
      className={cx('block', className)}
    >
      <defs>
        {/* The chamfer. Light enters top-left, so that corner is nearly white
            and the opposite one falls to the plate's shadow side. */}
        <linearGradient id={bevel} x1="6%" y1="0%" x2="94%" y2="100%">
          <stop offset="0%" stopColor="#E8ECF5" />
          <stop offset="18%" stopColor="#9AA6BC" />
          <stop offset="42%" stopColor="#4A5468" />
          <stop offset="62%" stopColor="#2A3242" />
          <stop offset="100%" stopColor="#6E7A93" />
        </linearGradient>

        <radialGradient id={face} cx="30%" cy="18%" r="92%">
          <stop offset="0%" stopColor="#252C3B" />
          <stop offset="58%" stopColor="#12161F" />
          <stop offset="100%" stopColor="#080B12" />
        </radialGradient>

        {/* The specular liner: opaque at the centre, gone at both ends. */}
        <linearGradient id={spec} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="22%" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="78%" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <linearGradient id={rim} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* The family's light, pooled. A radial fade rather than a filled
            ellipse: a hard-edged oval on a dark face reads as a sticker stuck
            to the plate, which is precisely what the first version looked
            like. */}
        <radialGradient id={pool} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={glow} stopOpacity="0.85" />
          <stop offset="45%" stopColor={glow} stopOpacity="0.35" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* The plate. */}
      <rect x="4" y="4" width="232" height="172" rx="34" fill={`url(#${bevel})`} />

      {/* The inset face. */}
      <rect x="20" y="19" width="200" height="142" rx="24" fill={`url(#${face})`} />

      {/* Top inner rim — the face catching the same light as the bevel. */}
      <rect x="20" y="19" width="200" height="40" rx="24" fill={`url(#${rim})`} opacity="0.5" />

      {/* The pool sits low and behind everything, so the plate looks lit from
          under its own bottom edge rather than decorated. */}
      <ellipse cx="120" cy="163" rx="86" ry="30" fill={`url(#${pool})`} />

      {/* The numeral, engraved. */}
      <text
        x="120"
        y="104"
        textAnchor="middle"
        fontSize="52"
        fontWeight="700"
        letterSpacing="-2"
        fill="none"
        stroke="#EEF1F7"
        strokeWidth="1.6"
        style={{
          fontFamily: 'var(--wariba-font-sans-loaded), var(--wariba-font-sans), sans-serif',
        }}
      >
        {sizeCode}
      </text>

      {/* The wordmark, solid and small — the object is branded, not labelled. */}
      <text
        x="120"
        y="133"
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="700"
        letterSpacing="3.4"
        fill="#8C97AC"
        style={{
          fontFamily: 'var(--wariba-font-sans-loaded), var(--wariba-font-sans), sans-serif',
        }}
      >
        WARIBA
      </text>

      {/* The specular liner, tucked against the bottom inner edge. */}
      <rect x="48" y="156" width="144" height="2.5" rx="1.25" fill={`url(#${spec})`} />
    </svg>
  );
}

/**
 * The pooled light inside the plate, per family.
 *
 * All three stay inside the cobalt system: ONE is the pure accent, FLEX drifts
 * toward the deeper indigo it owns, INSTANT carries a cyan edge. A family that
 * changed the plate to green would stop the object being WARIBA's, which is
 * the whole reason it exists.
 */
const FAMILY_GLOW: Record<AccountTokenFamily, string> = {
  /* All three stay inside the cobalt system — the differentiation is a shift
     along it, not a jump off it. A green INSTANT plate would read as a
     different company's product, which costs more than it wins. */
  one: '#4C74FF',
  flex: '#7C6BFF',
  instant: '#3FB8C4',
  neutral: '#3157F5',
};
