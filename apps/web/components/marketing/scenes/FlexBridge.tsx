import { cx } from '@wariba/ui';

export interface FlexBridgeProps {
  /** Pre-formatted, server-derived. This component computes no money. */
  upfront: string;
  activation: string;
  className?: string;
}

/**
 * FLEX — the Bridge.
 *
 * ## The note this was written against
 *
 * The mini-glyph in the shell was flagged as too abstract: "sans le label, je
 * ne comprends pas encore immédiatement que cette courbe représente aujourd'hui
 * → réussite → activation". A curve between two piers says *crossing*; it does
 * not say *what is on either side*.
 *
 * So this asset is built around the sequence rather than around the metaphor.
 * Four stations, left to right, each one a physical thing on the deck:
 *
 *   1. a lit pier carrying the amount paid today
 *   2. the span itself — the evaluation, traversed
 *   3. a gate that opens on success, carrying the activation amount
 *   4. the Performance platform, raised
 *
 * The deck climbs from left to right, so the shape alone says "this goes
 * somewhere". The gate is the only element drawn as a break in the deck, which
 * is what makes it read as a condition rather than as another step.
 *
 * ## Money
 *
 * Both amounts arrive pre-formatted from the canonical offer. Nothing here
 * multiplies, adds or rounds — a marketing asset that computes a price is a
 * second source of truth waiting to disagree with the first.
 */
export function FlexBridge({ upfront, activation, className }: FlexBridgeProps) {
  /* Le viewBox est recadré sur le contenu : le dessin occupe y≈58→300, et une
     boîte partant de 0 ajoutait un cinquième de hauteur vide au-dessus du
     pont. */
  return (
    <svg viewBox="0 52 720 256" aria-hidden="true" className={cx('block w-full', className)}>
      <defs>
        <linearGradient id="fb-deck" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B7BFF" stopOpacity="0.35" />
          <stop offset="46%" stopColor="#8B7BFF" stopOpacity="0.95" />
          <stop offset="62%" stopColor="#8B7BFF" stopOpacity="0.35" />
          <stop offset="78%" stopColor="#3157F5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#45C6D4" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="fb-pier" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5A5F70" />
          <stop offset="100%" stopColor="#1A1C21" />
        </linearGradient>
        <radialGradient id="fb-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8B7BFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#8B7BFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fb-glow-end" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#45C6D4" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#45C6D4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ground light at each end: the start is violet-indigo, the arrival is
          cyan. The colour shift alone tells you the two ends are different. */}
      <ellipse cx="96" cy="238" rx="98" ry="34" fill="url(#fb-glow)" />
      <ellipse cx="624" cy="176" rx="112" ry="38" fill="url(#fb-glow-end)" />

      {/* ── 1 · The pier you start from ── */}
      <rect x="62" y="196" width="76" height="52" rx="10" fill="url(#fb-pier)" />
      <rect x="62" y="196" width="76" height="4" rx="2" fill="#B9B2FF" opacity="0.55" />
      <circle cx="100" cy="182" r="11" fill="#8B7BFF" />
      <circle
        cx="100"
        cy="182"
        r="19"
        fill="none"
        stroke="#8B7BFF"
        strokeOpacity="0.4"
        strokeWidth="2"
      />

      {/* ── 2 · The span — the evaluation being crossed ── */}
      <path
        d="M100 182 C 190 150, 250 146, 314 150"
        fill="none"
        stroke="url(#fb-deck)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Deck ties, thinning as they climb: distance, cheaply. */}
      {[
        [150, 168, 196],
        [200, 158, 190],
        [250, 150, 186],
      ].map(([x, y1, y2]) => (
        <line
          key={x}
          x1={x}
          y1={y1}
          x2={x}
          y2={y2}
          stroke="#8B7BFF"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
      ))}

      {/* ── 3 · The gate — the only break in the deck ── */}
      <g>
        <rect x="314" y="96" width="6" height="58" rx="3" fill="#8B7BFF" opacity="0.55" />
        <rect x="392" y="96" width="6" height="58" rx="3" fill="#3157F5" opacity="0.55" />
        <path
          d="M320 128 H 392"
          stroke="#3157F5"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="10 8"
        />
        <circle cx="356" cy="128" r="17" fill="#0A0A0B" stroke="#3157F5" strokeWidth="2" />
        {/* The tick: this gate is passed, not merely present. */}
        <path
          d="M348 128 l6 6 12 -13"
          fill="none"
          stroke="#9DB4FF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* ── 4 · The raised Performance platform ── */}
      <path
        d="M398 150 C 462 152, 520 140, 570 122"
        fill="none"
        stroke="url(#fb-deck)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="556" y="122" width="128" height="56" rx="12" fill="url(#fb-pier)" />
      <rect x="556" y="122" width="128" height="4" rx="2" fill="#A9EEF6" opacity="0.6" />
      <circle cx="620" cy="108" r="13" fill="#45C6D4" />
      <circle
        cx="620"
        cy="108"
        r="23"
        fill="none"
        stroke="#45C6D4"
        strokeOpacity="0.4"
        strokeWidth="2"
      />

      {/* ── Labels. Small, because the shape is meant to carry it. ── */}
      <g fontFamily="var(--wariba-font-sans-loaded), var(--wariba-font-sans), sans-serif">
        <text
          x="100"
          y="278"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          letterSpacing="1.4"
          fill="#9AA3B1"
        >
          AUJOURD’HUI
        </text>
        <text x="100" y="296" textAnchor="middle" fontSize="15" fontWeight="700" fill="#F4F5F7">
          {upfront}
        </text>

        <text
          x="356"
          y="176"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          letterSpacing="1.4"
          fill="#9AA3B1"
        >
          RÉUSSITE
        </text>

        <text
          x="620"
          y="208"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          letterSpacing="1.4"
          fill="#9AA3B1"
        >
          ACTIVATION
        </text>
        <text x="620" y="226" textAnchor="middle" fontSize="15" fontWeight="700" fill="#F4F5F7">
          {activation}
        </text>
        <text x="620" y="250" textAnchor="middle" fontSize="11" fontWeight="600" fill="#45C6D4">
          Compte Performance
        </text>
      </g>
    </svg>
  );
}
