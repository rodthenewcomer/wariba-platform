'use client';

import { motion } from 'motion/react';
import { RadialGauge } from '../section07/primitives';
import type { PhaseVisualProps } from './PhaseCard';

/**
 * The four product scenes — one per phase, each mounted only once its
 * phase actually starts (`PhaseCard` gates that), so every `initial`/
 * `animate` pair here plays for the first time, visibly, right now.
 */

const FLEX_COLOR = '#8C7CFF';

/**
 * The Performance badge is the journey's payoff moment, so it gets a
 * one-off gold treatment rather than a role from the shared accent
 * palette (globals.css) — those six colours encode product state
 * (healthy, warning, breach…) and gold isn't one of them here, it's
 * a reward finish.
 */
export const PERFORMANCE_GOLD = '#E8B34A';
const PERFORMANCE_GOLD_BRIGHT = '#FFE29A';

export function SelectPathVisual({ reduced }: PhaseVisualProps) {
  return (
    <div className="relative flex h-full min-h-[9.5rem] items-center justify-center">
      <motion.div
        className="absolute flex h-[4.6rem] w-24 flex-col items-center justify-center gap-1 rounded-xl border font-mono text-[0.58rem] font-bold tracking-[0.08em]"
        style={{ borderColor: 'var(--wariba-seam)', background: 'var(--wariba-surface-2)' }}
        initial={reduced ? false : { opacity: 0, x: 0, y: 8, rotate: 0, scale: 0.92 }}
        animate={{ opacity: 0.82, x: -36, y: 10, rotate: -7, scale: 0.85 }}
        transition={{
          duration: reduced ? 0 : 0.4,
          delay: reduced ? 0 : 0.1,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <span style={{ color: 'var(--wariba-brand-300)' }}>ONE</span>
      </motion.div>

      <motion.div
        className="absolute flex h-[4.6rem] w-24 flex-col items-center justify-center gap-1 rounded-xl border font-mono text-[0.58rem] font-bold tracking-[0.08em]"
        style={{ borderColor: 'var(--wariba-seam)', background: 'var(--wariba-surface-2)' }}
        initial={reduced ? false : { opacity: 0, x: 0, y: 8, rotate: 0, scale: 0.92 }}
        animate={{ opacity: 0.82, x: 36, y: 10, rotate: 7, scale: 0.85 }}
        transition={{
          duration: reduced ? 0 : 0.4,
          delay: reduced ? 0 : 0.18,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <span style={{ color: 'var(--wariba-accent-cyan)' }}>INSTANT</span>
      </motion.div>

      <motion.div
        className="relative z-10 flex h-[5.6rem] w-28 flex-col items-center justify-center gap-1.5 rounded-xl border-2 font-mono text-xs font-bold tracking-[0.08em]"
        style={{
          borderColor: FLEX_COLOR,
          background: `color-mix(in srgb, ${FLEX_COLOR} 16%, var(--wariba-surface-1))`,
          color: '#D6D0FF',
          boxShadow: `0 14px 32px -14px color-mix(in srgb, ${FLEX_COLOR} 60%, transparent)`,
        }}
        initial={reduced ? false : { opacity: 0, y: 6, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: reduced ? 0 : 0.4,
          delay: reduced ? 0 : 0.3,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <span>FLEX</span>
        <motion.span
          className="rounded-full px-2.5 py-0.5 text-[0.58rem]"
          style={{ background: `color-mix(in srgb, ${FLEX_COLOR} 26%, transparent)` }}
          initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: reduced ? 0 : 0.32,
            delay: reduced ? 0 : 0.68,
            type: 'spring',
            stiffness: 320,
            damping: 18,
          }}
        >
          25K
        </motion.span>
      </motion.div>

      {reduced ? null : (
        <motion.span
          className="absolute z-10 h-[5.6rem] w-28 rounded-xl border-2"
          style={{ borderColor: FLEX_COLOR }}
          initial={{ opacity: 0.55, scale: 1 }}
          animate={{ opacity: 0, scale: 1.22 }}
          transition={{ duration: 0.6, delay: 0.72, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}

const CANDLES = [
  { height: 12, up: true },
  { height: 20, up: true },
  { height: 9, up: false },
  { height: 26, up: true },
  { height: 16, up: false },
  { height: 30, up: true },
  { height: 22, up: true },
  { height: 17, up: false },
] as const;

export function TradeTerminalVisual({ reduced }: PhaseVisualProps) {
  return (
    <div className="relative h-full min-h-[9.5rem]">
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-xl border"
        style={{
          borderColor: 'color-mix(in srgb, #4E8CFF 32%, var(--wariba-seam))',
          background:
            'linear-gradient(180deg, var(--wariba-surface-2), var(--wariba-color-carbon-980))',
        }}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.3 }}
      >
        <div
          className="flex items-center justify-between border-b px-2.5 py-1.5"
          style={{ borderColor: 'var(--wariba-seam)' }}
        >
          <span className="font-mono text-[0.6rem] font-bold text-[color:var(--wariba-on-dark)]">
            XAUUSD
          </span>
          <span
            className="rounded border px-1.5 py-0.5 font-mono text-[0.55rem] font-semibold"
            style={{ borderColor: 'var(--wariba-seam)', color: '#8FB4FF' }}
          >
            FLEX 25K
          </span>
        </div>

        <div className="relative flex h-[4.75rem] items-end gap-[3px] px-2.5 pt-2">
          {[0.32, 0.66].map((ratio) => (
            <span
              key={ratio}
              aria-hidden="true"
              className="absolute left-0 right-0 h-px"
              style={{ top: `${ratio * 100}%`, background: 'var(--wariba-seam)' }}
            />
          ))}
          {CANDLES.map((candle, index) => (
            <motion.span
              key={index}
              className="w-full origin-bottom rounded-[1px]"
              style={{
                height: candle.height,
                background: candle.up ? 'var(--wariba-accent-emerald)' : 'var(--wariba-accent-red)',
              }}
              initial={reduced ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{
                duration: reduced ? 0 : 0.28,
                delay: reduced ? 0 : 0.16 + index * 0.045,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
          <motion.span
            aria-hidden="true"
            className="absolute size-1.5 rounded-full"
            style={{
              right: '16%',
              top: '28%',
              background: 'var(--wariba-color-cobalt-300)',
              boxShadow: '0 0 8px 2px color-mix(in srgb, var(--wariba-brand-400) 60%, transparent)',
            }}
            initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : 0.64 }}
          />
        </div>

        <div className="flex items-center justify-between px-2.5 pb-1 font-mono text-[0.5rem] text-[color:var(--wariba-on-dark-dim)]">
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
        </div>

        <div className="flex gap-1.5 px-2.5 pb-2">
          <motion.span
            className="flex-1 rounded-md py-1 text-center font-mono text-[0.56rem] font-bold"
            style={{
              background: 'var(--wariba-accent-emerald-wash)',
              color: 'var(--wariba-accent-emerald)',
            }}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, delay: reduced ? 0 : 0.74 }}
          >
            ACHETER
          </motion.span>
          <motion.span
            className="flex-1 rounded-md py-1 text-center font-mono text-[0.56rem] font-bold"
            style={{
              background: 'var(--wariba-accent-red-wash)',
              color: 'var(--wariba-accent-red)',
            }}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, delay: reduced ? 0 : 0.8 }}
          >
            VENDRE
          </motion.span>
        </div>

        <div className="h-1 overflow-hidden" style={{ background: 'var(--wariba-track)' }}>
          <motion.div
            className="h-full"
            style={{ background: '#4E8CFF' }}
            initial={reduced ? false : { width: 0 }}
            animate={{ width: '62%' }}
            transition={{
              duration: reduced ? 0 : 0.5,
              delay: reduced ? 0 : 0.92,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}

export function ProgressVisual({ reduced }: PhaseVisualProps) {
  return (
    <div className="flex h-full min-h-[9.5rem] flex-col justify-center gap-4">
      <div className="flex items-center gap-4">
        <RadialGauge
          percent={64}
          label="Progression vers l’objectif"
          reduced={reduced}
          size={104}
          thickness={10}
          gradientFrom="var(--wariba-brand-400)"
          gradientTo="var(--wariba-accent-cyan)"
        >
          <span className="font-mono text-xl font-bold text-[color:var(--wariba-on-dark)]">
            64%
          </span>
        </RadialGauge>
        <div className="min-w-0 flex-1">
          <p className="text-[0.58rem] uppercase tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
            Risque restant
          </p>
          <p className="wariba-figure mt-0.5 text-lg font-semibold text-[color:var(--wariba-accent-emerald)]">
            82%
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[color:var(--wariba-track)]">
            <motion.div
              className="h-full rounded-full bg-[color:var(--wariba-accent-emerald)]"
              initial={reduced ? false : { width: 0 }}
              animate={{ width: '82%' }}
              transition={{
                duration: reduced ? 0 : 0.6,
                delay: reduced ? 0 : 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </div>
        </div>
      </div>

      <div className="relative mt-1">
        <div className="flex items-center justify-between font-mono text-[0.55rem] font-semibold tracking-[0.08em] text-[color:var(--wariba-on-dark-dim)]">
          <span>DÉPART</span>
          <span>OBJECTIF</span>
        </div>
        <div className="relative mt-2 h-1 rounded-full bg-[color:var(--wariba-track)]">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                'linear-gradient(90deg, var(--wariba-brand-400), var(--wariba-accent-cyan))',
            }}
            initial={reduced ? false : { width: 0 }}
            animate={{ width: '64%' }}
            transition={{
              duration: reduced ? 0 : 0.7,
              delay: reduced ? 0 : 0.45,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
          <motion.span
            className="absolute -top-1 -translate-x-1/2 rounded-full border-2"
            style={{
              height: 12,
              width: 12,
              borderColor: 'var(--wariba-color-carbon-980)',
              background: 'var(--wariba-color-cobalt-300)',
              boxShadow: '0 0 8px 2px color-mix(in srgb, var(--wariba-brand-400) 55%, transparent)',
            }}
            initial={reduced ? { opacity: 1, left: '64%' } : { opacity: 0, left: '0%' }}
            animate={{ opacity: 1, left: '64%' }}
            transition={{
              duration: reduced ? 0 : 0.7,
              delay: reduced ? 0 : 0.45,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </div>
        <motion.p
          className="mt-2 text-[0.58rem] text-[color:var(--wariba-on-dark-muted)]"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 1.1 }}
        >
          Prochaine étape à 3,6 pts
        </motion.p>
      </div>
    </div>
  );
}

export function PerformanceVisual({ reduced }: PhaseVisualProps) {
  return (
    <div className="flex h-full min-h-[9.5rem] flex-col justify-center gap-2.5">
      <div className="flex items-center justify-between px-1">
        <motion.span
          className="rounded-md border px-2 py-1 font-mono text-[0.55rem] font-semibold text-[color:var(--wariba-on-dark-dim)]"
          style={{ borderColor: 'var(--wariba-seam)' }}
          initial={reduced ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.15 }}
        >
          ONE / FLEX
        </motion.span>
        <motion.span
          className="rounded-md border px-2 py-1 font-mono text-[0.55rem] font-semibold text-[color:var(--wariba-on-dark-dim)]"
          style={{ borderColor: 'var(--wariba-seam)' }}
          initial={reduced ? false : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.22 }}
        >
          INSTANT
        </motion.span>
      </div>

      <svg
        viewBox="0 0 200 36"
        className="h-7 w-full"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M20,4 C 70,4 88,30 100,30"
          fill="none"
          stroke="var(--wariba-accent-emerald)"
          strokeWidth="1.5"
          strokeOpacity="0.55"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: reduced ? 0 : 0.5,
            delay: reduced ? 0 : 0.36,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
        <motion.path
          d="M180,4 C 130,10 108,24 100,30"
          fill="none"
          stroke="var(--wariba-accent-cyan)"
          strokeWidth="1.5"
          strokeOpacity="0.55"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: reduced ? 0 : 0.5,
            delay: reduced ? 0 : 0.44,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </svg>

      <motion.div
        className="relative mx-auto flex w-full max-w-[13.5rem] flex-col items-center gap-1 overflow-hidden rounded-xl border-2 px-4 py-3"
        style={{
          borderColor: PERFORMANCE_GOLD,
          background: `linear-gradient(160deg, color-mix(in srgb, ${PERFORMANCE_GOLD} 22%, var(--wariba-surface-1)), var(--wariba-surface-1))`,
          boxShadow: `0 0 28px 2px color-mix(in srgb, ${PERFORMANCE_GOLD} 45%, transparent), 0 14px 32px -14px color-mix(in srgb, ${PERFORMANCE_GOLD} 65%, transparent)`,
        }}
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0.35, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduced ? 0 : 0.4,
          delay: reduced ? 0 : 0.58,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {reduced ? null : (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12"
            style={{
              background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${PERFORMANCE_GOLD_BRIGHT} 55%, transparent), transparent)`,
            }}
            initial={{ x: '-140%' }}
            animate={{ x: '240%' }}
            transition={{
              duration: 1.6,
              delay: 1.1,
              repeat: Infinity,
              repeatDelay: 2.4,
              ease: 'easeInOut',
            }}
          />
        )}
        <span className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
          WARIBA
        </span>
        <span
          className="font-mono text-base font-bold uppercase tracking-[0.08em]"
          style={{
            color: PERFORMANCE_GOLD_BRIGHT,
            textShadow: `0 0 12px color-mix(in srgb, ${PERFORMANCE_GOLD} 65%, transparent)`,
          }}
        >
          PERFORMANCE
        </span>
        <span className="font-mono text-[0.6rem] text-[color:var(--wariba-on-dark-muted)]">
          25K · Compte simulé
        </span>
      </motion.div>
    </div>
  );
}
