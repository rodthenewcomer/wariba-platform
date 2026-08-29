import { cx } from '@wariba/ui';

/**
 * The Performance Core.
 *
 * The object that marks the end of every WARIBA journey: a machined housing
 * with a lit centre. It is used wherever "you have arrived at the Performance
 * account" needs a face — the last How-It-Works step, the final CTA.
 *
 * Emerald at the centre, cobalt in the housing. That pairing is the system's
 * whole semantic in one object: the brand carries you, achievement is green.
 */
export function PerformanceCore({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" aria-hidden="true" className={cx('block w-full', className)}>
      <defs>
        <linearGradient id="pc-shell" x1="14%" y1="0%" x2="86%" y2="100%">
          <stop offset="0%" stopColor="#DFE5F0" />
          <stop offset="24%" stopColor="#7C8799" />
          <stop offset="54%" stopColor="#262A33" />
          <stop offset="100%" stopColor="#5D6779" />
        </linearGradient>
        <radialGradient id="pc-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D8FFEC" />
          <stop offset="30%" stopColor="#36B37E" />
          <stop offset="70%" stopColor="#1E39AE" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3157F5" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="200" cy="336" rx="140" ry="32" fill="#36B37E" opacity="0.14" />

      {/* Six housing segments around the core — machined, not drawn. */}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 200 196)`}>
          <rect x="186" y="34" width="28" height="52" rx="9" fill="url(#pc-shell)" />
        </g>
      ))}

      <circle cx="200" cy="196" r="140" fill="url(#pc-shell)" />
      <circle cx="200" cy="196" r="120" fill="#0A0A0B" />
      <circle
        cx="200"
        cy="196"
        r="104"
        fill="none"
        stroke="#36B37E"
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />
      <circle
        cx="200"
        cy="196"
        r="82"
        fill="none"
        stroke="#36B37E"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <circle cx="200" cy="196" r="72" fill="url(#pc-core)" />
      <circle cx="200" cy="196" r="26" fill="#EAFFF4" />

      <path
        d="M108 122 A 140 140 0 0 1 232 58"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.45"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
