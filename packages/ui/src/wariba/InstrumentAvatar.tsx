import type { CSSProperties } from 'react';

/**
 * VX1-E — instrument identity.
 *
 * WariX shows every instrument as plain text, which is why browsing a market
 * list is a reading exercise rather than a scanning one. A trader looking for
 * gold should find it by shape before they find it by spelling.
 *
 * The rules this obeys, and why:
 *
 * **No flags.** A currency is not a country — EUR has no flag that is honest,
 * USD is quoted far outside the United States, and flag artwork carries
 * political and licensing baggage a trading product does not need. Currency
 * medallions say the same thing without any of it.
 *
 * **No emoji.** Emoji render differently on every operating system and font
 * stack, which makes them the opposite of a controlled identity.
 *
 * **No new market data.** An avatar is presentation. It never implies a price,
 * a session, a volume or a change the backend does not publish.
 *
 * **One home.** The mapping from an instrument to its identity lives here, so
 * Markets, search, the instrument selector and every future Trader Hub surface
 * show the same mark instead of each inventing one.
 */

export type InstrumentAvatarSize = 'sm' | 'md' | 'lg';

/** Mirrors `AssetClass` in `@wariba/contracts` without importing across the boundary. */
export type InstrumentAssetClass = 'forex_major' | 'metal' | 'index_cfd_simulated' | string;

export interface InstrumentAvatarProps {
  symbol: string;
  /**
   * Authoritative class from the symbol spec. Identity is never guessed from
   * the ticker alone. `undefined` is accepted explicitly — a spec that has not
   * loaded yet renders the generic mark rather than the wrong one.
   */
  assetClass?: InstrumentAssetClass | undefined;
  size?: InstrumentAvatarSize | undefined;
  className?: string | undefined;
}

const AVATAR_PX: Record<InstrumentAvatarSize, number> = {
  sm: 30,
  md: 32,
  lg: 34,
};

interface CurrencyIdentity {
  /** The glyph shown in the medallion. One character wherever a currency has one. */
  mark: string;
  /** Medallion fill. Deep and desaturated: these sit next to live prices all day. */
  fill: string;
  /** Ring and glyph colour. */
  ink: string;
}

/**
 * Currency medallions.
 *
 * Tones are chosen to be distinguishable at 22px without competing with the
 * semantic palette: nothing here may read as buy-green, sell-coral or
 * alert-amber, because those colours mean something specific everywhere else in
 * the workstation.
 */
const CURRENCY: Record<string, CurrencyIdentity> = {
  USD: {
    mark: '$',
    fill: 'var(--wariba-color-emerald-900)',
    ink: 'var(--wariba-color-emerald-400)',
  },
  EUR: {
    mark: '€',
    fill: 'var(--wariba-color-cobalt-900)',
    ink: 'var(--wariba-color-cobalt-300)',
  },
  GBP: {
    mark: '£',
    fill: 'var(--wariba-color-violet-900)',
    ink: 'var(--wariba-color-violet-400)',
  },
  JPY: {
    mark: '¥',
    fill: 'var(--wariba-color-coral-900)',
    ink: 'var(--wariba-color-coral-400)',
  },
  CHF: {
    mark: '₣',
    fill: 'var(--wariba-color-ink-790)',
    ink: 'var(--wariba-color-violet-100)',
  },
  AUD: {
    mark: 'A',
    fill: 'var(--wariba-color-ink-800)',
    ink: 'var(--wariba-color-aqua-400)',
  },
  CAD: {
    mark: 'C',
    fill: 'var(--wariba-color-ink-790)',
    ink: 'var(--wariba-color-copper-200)',
  },
  /** Gold is a metal, not a currency, but it occupies the base slot of XAUUSD. */
  XAU: {
    mark: 'Au',
    fill: 'var(--wariba-color-amber-900)',
    ink: 'var(--wariba-color-amber-400)',
  },
  XAG: {
    mark: 'Ag',
    fill: 'var(--wariba-color-ink-800)',
    ink: 'var(--wariba-color-ink-200)',
  },
};

const FALLBACK: CurrencyIdentity = {
  mark: '•',
  fill: 'var(--wariba-color-ink-850)',
  ink: 'var(--wariba-color-ink-300)',
};

/**
 * Splits a six-letter FX ticker into its two currencies.
 *
 * Only applied when the authoritative asset class says this is a currency pair
 * or a metal quoted against one. It is a presentation convenience, never a
 * classification: an instrument's class comes from the symbol spec.
 */
export function splitCurrencyPair(symbol: string): { base: string; quote: string } | null {
  const normalized = symbol.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (normalized.length !== 6) return null;
  return { base: normalized.slice(0, 3), quote: normalized.slice(3) };
}

function currencyOf(code: string): CurrencyIdentity {
  return CURRENCY[code] ?? FALLBACK;
}

/**
 * Paired identity for a currency pair or a metal quoted in one.
 *
 * Two equal overlapping circles was the first attempt and it failed at the size
 * that matters: at 22px in a market row the two medallions merged into one
 * ambiguous blob. The composition is now a full-size base medallion with the
 * quote currency as a small badge on its lower-right — the same idiom an app
 * icon uses for a secondary mark, and legible at a glance because one shape
 * dominates and the other annotates it.
 *
 * The base wins because it is what the trader is long or short of.
 */
function PairedIdentity({ base, quote }: { base: string; quote: string }) {
  const baseIdentity = currencyOf(base);
  const quoteIdentity = currencyOf(quote);
  const baseFontSize = baseIdentity.mark.length > 1 ? 10 : 14;
  const quoteFontSize = quoteIdentity.mark.length > 1 ? 6.5 : 9;
  return (
    <>
      <circle cx="14" cy="14" r="13" fill={baseIdentity.fill} />
      <circle
        cx="14"
        cy="14"
        r="12.1"
        fill="none"
        stroke={baseIdentity.ink}
        strokeOpacity="0.5"
        strokeWidth="1.4"
      />
      <text
        x="14"
        y="14"
        fill={baseIdentity.ink}
        fontSize={baseFontSize}
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontFamily: 'inherit', letterSpacing: '-0.03em' }}
      >
        {baseIdentity.mark}
      </text>
      {/* A cut-out so the badge reads as sitting in front rather than merging. */}
      <circle cx="24" cy="24" r="9" fill="var(--warix-surface, var(--wariba-color-ink-900))" />
      <circle cx="24" cy="24" r="7.4" fill={quoteIdentity.fill} />
      <circle
        cx="24"
        cy="24"
        r="6.7"
        fill="none"
        stroke={quoteIdentity.ink}
        strokeOpacity="0.55"
        strokeWidth="1.2"
      />
      <text
        x="24"
        y="24"
        fill={quoteIdentity.ink}
        fontSize={quoteFontSize}
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontFamily: 'inherit', letterSpacing: '-0.03em' }}
      >
        {quoteIdentity.mark}
      </text>
    </>
  );
}

/**
 * Index identity.
 *
 * A market-breadth abstraction — ascending columns inside a medallion — rather
 * than any exchange's artwork. Index marks are trademarks; a generic rising
 * grid says "index" without borrowing anyone's brand.
 */
function IndexIdentity({ label }: { label: string }) {
  return (
    <>
      <rect x="4" y="4" width="24" height="24" rx="8" fill="var(--wariba-color-violet-900)" />
      <rect
        x="4.75"
        y="4.75"
        width="22.5"
        height="22.5"
        rx="7.4"
        fill="none"
        stroke="var(--wariba-color-violet-400)"
        strokeOpacity="0.4"
        strokeWidth="1.2"
      />
      <g fill="var(--wariba-color-violet-400)">
        <rect x="9.5" y="17" width="3" height="6" rx="1.2" />
        <rect x="14.5" y="13" width="3" height="10" rx="1.2" />
        <rect x="19.5" y="9" width="3" height="14" rx="1.2" />
      </g>
      <title>{label}</title>
    </>
  );
}

/** Last resort: a neutral medallion carrying the ticker's first letters. */
function GenericIdentity({ symbol }: { symbol: string }) {
  const initials = symbol
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase();
  return (
    <>
      <circle cx="16" cy="16" r="12" fill="var(--wariba-color-ink-850)" />
      <circle
        cx="16"
        cy="16"
        r="11.25"
        fill="none"
        stroke="var(--wariba-color-ink-300)"
        strokeOpacity="0.4"
        strokeWidth="1.2"
      />
      <text
        x="16"
        y="16"
        fill="var(--wariba-color-ink-200)"
        fontSize="10"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontFamily: 'inherit' }}
      >
        {initials}
      </text>
    </>
  );
}

/**
 * The one instrument identity mark.
 *
 * Renders from the authoritative asset class first and the ticker second, so an
 * instrument added to the database appears with a sensible generic identity
 * rather than with nothing or with a wrong one.
 */
export function InstrumentAvatar({
  symbol,
  assetClass,
  size = 'sm',
  className = '',
}: InstrumentAvatarProps) {
  const px = AVATAR_PX[size];
  const pair =
    assetClass === 'forex_major' || assetClass === 'metal' ? splitCurrencyPair(symbol) : null;
  const style: CSSProperties = { flex: 'none' };

  return (
    <svg
      aria-hidden="true"
      className={`warix-instrument-avatar ${className}`.trim()}
      data-instrument-avatar={symbol}
      focusable="false"
      height={px}
      role="presentation"
      style={style}
      viewBox="0 0 32 32"
      width={px}
    >
      {pair !== null ? (
        <PairedIdentity base={pair.base} quote={pair.quote} />
      ) : assetClass === 'index_cfd_simulated' ? (
        <IndexIdentity label={symbol} />
      ) : (
        <GenericIdentity symbol={symbol} />
      )}
    </svg>
  );
}
