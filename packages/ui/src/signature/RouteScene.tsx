import { cx } from '../lib/cx';

export type RouteSceneFamily = 'one' | 'flex' | 'instant';

export interface RouteSceneProps {
  family: RouteSceneFamily;
  /** `banner` fills the head of a menu card; `tile` sits beside a drawer row. */
  variant?: 'banner' | 'tile';
  className?: string;
}

/**
 * The three product families, as mini scenes — Phase 3.4.5A.1 §10.
 *
 * ## Why these replaced the 40px glyphs
 *
 * The first pass shipped three 40px marks and the owner's verdict was exact:
 * the mega-menu was still "trois cards rectangulaires avec texte + tiny icon".
 * A 40px mark next to two lines of copy is an icon — it decorates the text. To
 * be an *identity* the object has to be recognisable before anything is read,
 * which means it has to own a share of the card rather than sit in its corner.
 *
 * The banner variant is 240×120 and spans the full width of a menu card, so
 * roughly a third of it is the object. That is the difference between a link
 * with a bullet and a product with a face.
 *
 * ## Still not the final assets
 *
 * The cinematic `OneTargetReactor`, `FlexBridge` and `InstantPortal` belong to
 * phases B–F, where the pages that carry them are built. These are ~1.5KB of
 * inline SVG each: no image request, no WebGL, nothing on the critical path of
 * a menu that opens on every public route.
 *
 * ## Light is localised
 *
 * Each scene carries its own bloom, clipped to its own box. That is the
 * amendment's rule made structural — the page is black and the light happens
 * *on objects*, rather than a page-wide radial pretending to be depth.
 */
export function RouteScene({ family, variant = 'banner', className }: RouteSceneProps) {
  const tint = TINT[family];
  const id = `wrs-${family}-${variant}`;
  const banner = variant === 'banner';

  return (
    <svg
      viewBox={banner ? '0 0 240 120' : '0 0 64 64'}
      role="img"
      aria-label={LABEL[family]}
      preserveAspectRatio="xMidYMid slice"
      className={cx('block', banner ? 'h-[104px] w-full' : 'size-16 shrink-0', className)}
    >
      <defs>
        <radialGradient id={`${id}-bloom`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={tint} stopOpacity="0.55" />
          <stop offset="55%" stopColor={tint} stopOpacity="0.16" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-span`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={tint} stopOpacity="0.25" />
          <stop offset="50%" stopColor={tint} stopOpacity="1" />
          <stop offset="100%" stopColor={tint} stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* The scene's own ground: a shade above the card, never a second black. */}
      <rect width="100%" height="100%" fill="#0A0A0B" />

      {banner ? (
        <>
          {/* A faint field, so the object sits in space rather than on a void.
              Twelve lines, no image, invisible until you look for it. */}
          <g stroke="#FFFFFF" strokeOpacity="0.045" strokeWidth="1">
            {[20, 40, 60, 80, 100].map((y) => (
              <line key={y} x1="0" y1={y} x2="240" y2={y} />
            ))}
            {[40, 80, 120, 160, 200].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="120" />
            ))}
          </g>
          <ellipse cx="120" cy="66" rx="96" ry="52" fill={`url(#${id}-bloom)`} />
        </>
      ) : (
        <circle cx="32" cy="34" r="28" fill={`url(#${id}-bloom)`} />
      )}

      <g transform={banner ? 'translate(120 58)' : 'translate(32 32) scale(0.48)'}>
        {family === 'one' ? <OneTarget tint={tint} spanId={`${id}-span`} /> : null}
        {family === 'flex' ? <FlexBridge tint={tint} spanId={`${id}-span`} /> : null}
        {family === 'instant' ? <InstantPortal tint={tint} /> : null}
      </g>
    </svg>
  );
}

/**
 * ONE — a target closing on its centre.
 *
 * Three rings tightening inward and a single tick arriving from the left. The
 * argument of ONE is proof: one attempt, one line, one centre.
 */
function OneTarget({ tint, spanId }: { tint: string; spanId: string }) {
  return (
    <g fill="none" strokeLinecap="round">
      <circle r="42" stroke={tint} strokeOpacity="0.16" strokeWidth="1.5" />
      <circle r="30" stroke={tint} strokeOpacity="0.3" strokeWidth="1.5" />
      <circle r="18" stroke={tint} strokeOpacity="0.55" strokeWidth="1.75" />
      {/* The arriving path — the only element that is fully lit. */}
      <path d="M-78 26 C -52 22, -34 8, -14 -2" stroke={`url(#${spanId})`} strokeWidth="2.5" />
      <circle r="6" fill={tint} stroke="none" />
      <circle r="11" stroke={tint} strokeOpacity="0.7" strokeWidth="1.25" />
    </g>
  );
}

/**
 * FLEX — two platforms at different heights, joined by a lit span.
 *
 * The left pier is low and near, the right one higher and further: you start
 * from where you are and the span carries you up. The marker sits mid-crossing
 * because that is where FLEX's second payment happens.
 */
function FlexBridge({ tint, spanId }: { tint: string; spanId: string }) {
  return (
    <g fill="none" strokeLinecap="round">
      <rect x="-84" y="16" width="34" height="9" rx="4.5" fill={tint} fillOpacity="0.28" />
      <rect x="50" y="-6" width="34" height="9" rx="4.5" fill={tint} fillOpacity="0.28" />
      <path d="M-67 16 V 34" stroke={tint} strokeOpacity="0.3" strokeWidth="2" />
      <path d="M67 3 V 34" stroke={tint} strokeOpacity="0.3" strokeWidth="2" />
      <path d="M-67 16 C -34 -14, 34 -22, 67 -2" stroke={`url(#${spanId})`} strokeWidth="3" />
      <circle cx="-67" cy="16" r="5" fill={tint} />
      <circle cx="67" cy="-2" r="5" fill={tint} />
      <circle cx="2" cy="-15" r="7.5" fill={tint} />
      <circle cx="2" cy="-15" r="13" stroke={tint} strokeOpacity="0.45" strokeWidth="1.5" />
    </g>
  );
}

/**
 * INSTANT — an aperture already open, with the core lit.
 *
 * No approach path and no crossing: the light is simply on. That absence is
 * the product argument — there is no evaluation between you and Performance.
 */
function InstantPortal({ tint }: { tint: string }) {
  return (
    <g fill="none" strokeLinecap="round">
      <rect
        x="-52"
        y="-40"
        width="104"
        height="80"
        rx="26"
        stroke={tint}
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      <rect
        x="-36"
        y="-28"
        width="72"
        height="56"
        rx="19"
        stroke={tint}
        strokeOpacity="0.38"
        strokeWidth="1.5"
      />
      <rect
        x="-20"
        y="-16"
        width="40"
        height="32"
        rx="12"
        stroke={tint}
        strokeOpacity="0.75"
        strokeWidth="1.75"
      />
      {/* Light escaping the aperture, left and right. */}
      <path d="M-72 0 H -58 M58 0 H 72" stroke={tint} strokeOpacity="0.55" strokeWidth="2" />
      <circle r="7" fill={tint} />
      <circle r="13" stroke={tint} strokeOpacity="0.6" strokeWidth="1.5" />
    </g>
  );
}

/*
 * Family tints stay on the cobalt scale. ONE is the pure accent, FLEX drifts to
 * the indigo it owns, INSTANT carries the cyan edge. A green INSTANT would read
 * as a second brand — the shell exists so a blurred screenshot still says
 * WARIBA.
 */
const TINT: Record<RouteSceneFamily, string> = {
  one: '#5C7FFF',
  flex: '#8B7BFF',
  instant: '#45C6D4',
};

const LABEL: Record<RouteSceneFamily, string> = {
  one: 'WARIBA ONE — une évaluation, une seule étape',
  flex: 'WARIBA FLEX — commencez avec moins, payez le reste après',
  instant: 'WARIBA INSTANT — pas d’évaluation',
};
