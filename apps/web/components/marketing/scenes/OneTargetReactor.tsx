import { cx } from '@wariba/ui';

export interface OneTargetReactorProps {
  /** `0` to `1` — how far the ring has closed. Server-derived, never invented. */
  progress?: number;
  className?: string;
}

/**
 * ONE — the Target Reactor.
 *
 * ## What the object has to say
 *
 * ONE's argument is proof: one evaluation, one target, one line. So the object
 * is a machined ring with an arc closing on it — the progress *is* the shape,
 * not a bar drawn beside it.
 *
 * ## Why this is SVG and not a render
 *
 * The phase allows premium approximations while the final 3D library does not
 * exist, and asks that the seams be documented. This is that approximation: a
 * bevelled outer ring, a brushed inner face, a specular arc across the top-left
 * and a cobalt core. It reads as machined because of the *arc* highlight — a
 * flat stroke reads as a circle, an arc that only covers a quarter turn reads
 * as light landing on metal.
 *
 * When the real asset lands it replaces this file wholesale: nothing else
 * imports its internals.
 */
export function OneTargetReactor({ progress = 0.68, className }: OneTargetReactorProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = 128;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 400 400" aria-hidden="true" className={cx('block w-full', className)}>
      <defs>
        {/* The bevel: light from the top-left, shadow falling away bottom-right. */}
        <linearGradient id="otr-bevel" x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor="#E9EDF6" />
          <stop offset="20%" stopColor="#8E99AF" />
          <stop offset="46%" stopColor="#3A4152" />
          <stop offset="70%" stopColor="#22262F" />
          <stop offset="100%" stopColor="#6C7689" />
        </linearGradient>
        <radialGradient id="otr-face" cx="34%" cy="24%" r="86%">
          <stop offset="0%" stopColor="#1B1D22" />
          <stop offset="62%" stopColor="#0E0F12" />
          <stop offset="100%" stopColor="#070708" />
        </radialGradient>
        <radialGradient id="otr-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9DB4FF" />
          <stop offset="38%" stopColor="#3157F5" />
          <stop offset="100%" stopColor="#1E39AE" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="otr-arc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9DB4FF" />
          <stop offset="55%" stopColor="#3157F5" />
          <stop offset="100%" stopColor="#3157F5" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* Pooled light under the object, so it sits on the page instead of
          floating in front of it. */}
      <ellipse cx="200" cy="332" rx="150" ry="34" fill="#3157F5" opacity="0.13" />

      <circle cx="200" cy="196" r="164" fill="url(#otr-bevel)" />
      <circle cx="200" cy="196" r="146" fill="url(#otr-face)" />

      {/* Brushed concentric grooves — three, faint. More looks printed. */}
      {[118, 92, 66].map((r) => (
        <circle
          key={r}
          cx="200"
          cy="196"
          r={r}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.05"
          strokeWidth="1"
        />
      ))}

      {/* The track and the progress arc. */}
      <circle
        cx="200"
        cy="196"
        r={radius}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.07"
        strokeWidth="10"
      />
      <circle
        cx="200"
        cy="196"
        r={radius}
        fill="none"
        stroke="url(#otr-arc)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${circumference * clamped} ${circumference}`}
        transform="rotate(-90 200 196)"
      />

      {/* The core. */}
      <circle cx="200" cy="196" r="52" fill="url(#otr-core)" opacity="0.9" />
      <circle cx="200" cy="196" r="19" fill="#EAF0FF" />

      {/* The specular arc — the detail that makes the ring read as metal
          rather than as a drawn circle. */}
      <path
        d="M92 118 A 164 164 0 0 1 236 42"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.5"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
