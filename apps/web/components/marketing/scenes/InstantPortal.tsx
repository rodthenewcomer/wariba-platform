import { cx } from '@wariba/ui';

/**
 * INSTANT — the Portal.
 *
 * The aperture is already open and the core is already lit. That absence of
 * approach is the entire product argument: nothing stands between the trader
 * and the Performance account.
 *
 * Cyan-edged, cobalt-bodied. It reads as a different family without leaving the
 * brand — a green portal would be a second company's object.
 */
export function InstantPortal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" aria-hidden="true" className={cx('block w-full', className)}>
      <defs>
        <linearGradient id="ip-frame" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#E4EAF4" />
          <stop offset="22%" stopColor="#7F8B9E" />
          <stop offset="52%" stopColor="#2B3038" />
          <stop offset="100%" stopColor="#616B7C" />
        </linearGradient>
        <radialGradient id="ip-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D6FAFF" />
          <stop offset="26%" stopColor="#45C6D4" />
          <stop offset="62%" stopColor="#2E7FB8" />
          <stop offset="100%" stopColor="#3157F5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ip-beam" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#45C6D4" stopOpacity="0" />
          <stop offset="50%" stopColor="#45C6D4" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#45C6D4" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse cx="200" cy="336" rx="146" ry="32" fill="#45C6D4" opacity="0.12" />

      {/* Light escaping the aperture, left and right. This is what says the
          portal is *on* rather than merely present. */}
      <rect x="8" y="188" width="384" height="16" fill="url(#ip-beam)" opacity="0.55" />

      <rect x="52" y="52" width="296" height="292" rx="82" fill="url(#ip-frame)" />
      <rect x="76" y="76" width="248" height="244" rx="64" fill="#0A0A0B" />

      <rect
        x="104"
        y="104"
        width="192"
        height="188"
        rx="52"
        fill="none"
        stroke="#45C6D4"
        strokeOpacity="0.28"
        strokeWidth="2"
      />
      <rect
        x="130"
        y="130"
        width="140"
        height="136"
        rx="40"
        fill="none"
        stroke="#45C6D4"
        strokeOpacity="0.55"
        strokeWidth="2"
      />

      <circle cx="200" cy="198" r="78" fill="url(#ip-core)" />
      <circle cx="200" cy="198" r="22" fill="#EAFDFF" />

      <path
        d="M96 128 A 82 82 0 0 1 168 62"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.45"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
