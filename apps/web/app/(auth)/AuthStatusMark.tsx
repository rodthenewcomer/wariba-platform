/**
 * The mark an outcome screen opens with.
 *
 * A confirmation that arrives as a heading and a paragraph makes someone read
 * before they know whether the news is good. A single glyph resolves that in
 * the time it takes the eye to land, which is the entire job — so it is a
 * status mark, not a celebration. No confetti, no animation loop, no burst:
 * a person who has just recovered a password is relieved, not delighted, and
 * a financial product that throws a party over routine account maintenance
 * spends credibility it will need later.
 *
 * Colour is never the only carrier. The three tones draw three different
 * shapes — a check, a clock, a slash — so the state survives greyscale and
 * colour-blindness.
 */

export type AuthStatusMarkTone = 'success' | 'pending' | 'expired';

const TONE = {
  success: {
    mark: 'var(--wariba-component-workstation-trading-buy)',
    wash: 'color-mix(in srgb, var(--wariba-component-workstation-trading-buy) 14%, transparent)',
    ring: 'color-mix(in srgb, var(--wariba-component-workstation-trading-buy) 34%, transparent)',
    path: <path d="m7.6 12.4 3 3 5.8-6.2" />,
  },
  pending: {
    mark: 'var(--warix-accent-cobalt)',
    wash: 'color-mix(in srgb, var(--warix-accent-cobalt) 14%, transparent)',
    ring: 'color-mix(in srgb, var(--warix-accent-cobalt) 34%, transparent)',
    path: (
      <>
        <circle cx="12" cy="12" r="7" />
        <path d="M12 8.6V12l2.4 1.6" />
      </>
    ),
  },
  expired: {
    mark: 'var(--wariba-component-workstation-trading-warning)',
    wash: 'color-mix(in srgb, var(--wariba-component-workstation-trading-warning) 14%, transparent)',
    ring: 'color-mix(in srgb, var(--wariba-component-workstation-trading-warning) 34%, transparent)',
    path: (
      <>
        <circle cx="12" cy="12" r="7" />
        <path d="M9.2 14.8 14.8 9.2" />
      </>
    ),
  },
} as const;

export function AuthStatusMark({ tone }: { tone: AuthStatusMarkTone }) {
  const style = TONE[tone];

  return (
    <span
      aria-hidden="true"
      data-testid="auth-status-mark"
      data-tone={tone}
      className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] ring-1 ring-inset"
      style={{ background: style.wash, ['--tw-ring-color' as string]: style.ring }}
    >
      <svg
        fill="none"
        height="26"
        stroke={style.mark}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="26"
      >
        {style.path}
      </svg>
    </span>
  );
}
