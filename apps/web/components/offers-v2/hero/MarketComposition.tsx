'use client';

import { motion } from 'motion/react';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';
import { MARKET_WORDS } from './markets';

interface MarketCompositionProps {
  marketIndex: number;
}

/**
 * The hero's right-side visual — the trading universe itself, not a second
 * offer-selection UI. The three product "monoliths" this replaced consumed
 * too much attention for what they communicated (product identity, which
 * the eyebrow and headline already carry) and nothing at all about
 * markets, which is the hero's actual subject. This is a single abstract
 * market composition instead: a receding grid suggesting depth, one price
 * trace, and three instrument tags — EUR/USD, NAS100, XAU/USD, WARIBA's
 * actual `TRADABLE_SYMBOLS` buckets (see `markets.ts`'s own comment), never
 * live figures beside them. The tag matching the active headline phrase
 * and the trace's own colour both shift with `marketIndex`, so the two
 * halves of the hero read as one composition rather than text next to
 * decoration.
 */
export function MarketComposition({ marketIndex }: MarketCompositionProps) {
  const reduced = useHydratedReducedMotion();
  const active = MARKET_WORDS[marketIndex]!;

  const tags: readonly { bucket: (typeof MARKET_WORDS)[number]['bucket']; label: string; x: number; y: number }[] = [
    { bucket: 'forex', label: 'EUR/USD', x: 88, y: 372 },
    { bucket: 'indices', label: 'NAS100', x: 372, y: 156 },
    { bucket: 'metals', label: 'XAU/USD', x: 512, y: 268 },
  ];

  return (
    <div
      aria-hidden="true"
      className="relative mt-10 h-[30svh] min-h-[220px] w-full lg:absolute lg:inset-y-0 lg:right-[-4%] lg:mt-0 lg:h-auto lg:w-[52vw]"
    >
      <svg
        viewBox="0 0 640 520"
        fill="none"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="market-trace-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={active.color} stopOpacity="0" />
            <stop offset="18%" stopColor={active.color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={active.color} stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="market-ambient" cx="60%" cy="45%" r="55%">
            <stop offset="0%" stopColor={active.color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={active.color} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="640" height="520" fill="url(#market-ambient)" style={{ transition: 'fill 600ms ease' }} />

        {/* Receding grid — perspective, not a chart. */}
        <g stroke="white" strokeOpacity="0.05" strokeWidth="1">
          {Array.from({ length: 6 }, (_, row) => (
            <line key={`h${row}`} x1="20" y1={80 + row * 76} x2="620" y2={80 + row * 76} />
          ))}
          {Array.from({ length: 7 }, (_, col) => (
            <line key={`v${col}`} x1={40 + col * 96} y1="60" x2={40 + col * 96 - 40} y2="500" />
          ))}
        </g>

        {/* The price trace — one continuous line, abstract, no data behind it. */}
        <motion.path
          d="M60 400 C160 400 170 300 250 300 S340 210 400 210 S480 130 560 120"
          stroke="url(#market-trace-fade)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={false}
          {...(!reduced
            ? {
                animate: { strokeDashoffset: [0, -24] },
                transition: { duration: 3.4, repeat: Infinity, ease: 'linear' as const },
              }
            : {})}
          strokeDasharray="1 9"
          style={{
            filter: `drop-shadow(0 0 10px color-mix(in srgb, ${active.color} 45%, transparent))`,
            transition: 'filter 600ms ease',
          }}
        />
        <path
          d="M60 400 C160 400 170 300 250 300 S340 210 400 210 S480 130 560 120"
          stroke="white"
          strokeOpacity="0.08"
          strokeWidth="1"
          fill="none"
        />

        {/* Trace endpoint — a quiet marker, not a live-price dot. */}
        <circle cx="560" cy="120" r="4" fill={active.color} style={{ transition: 'fill 600ms ease' }} />
        <circle
          cx="560"
          cy="120"
          r="9"
          fill="none"
          stroke={active.color}
          strokeOpacity="0.4"
          style={{ transition: 'stroke 600ms ease' }}
        />
      </svg>

      {/* Instrument tags — atmospheric labels, never live quotes. */}
      {tags.map((tag) => {
        const isActive = tag.bucket === active.bucket;
        return (
          <div
            key={tag.bucket}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-all duration-500"
            style={{
              left: `${(tag.x / 640) * 100}%`,
              top: `${(tag.y / 520) * 100}%`,
              borderColor: isActive
                ? `color-mix(in srgb, ${active.color} 60%, transparent)`
                : 'var(--commerce-rule, rgba(255,255,255,0.1))',
              background: isActive
                ? `color-mix(in srgb, ${active.color} 16%, transparent)`
                : 'rgba(10,10,12,0.5)',
              color: isActive ? active.color : 'var(--wariba-on-dark-dim, rgba(255,255,255,0.5))',
              opacity: isActive ? 1 : 0.55,
              transform: `translate(-50%, -50%) scale(${isActive ? 1.06 : 1})`,
            }}
          >
            {tag.label}
          </div>
        );
      })}
    </div>
  );
}
