'use client';

import { animate, useMotionValue, useReducedMotion, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useHydratedReducedMotion } from './useHydratedReducedMotion';

/**
 * WARIBA's motion vocabulary.
 *
 * ## What motion is for here
 *
 * A trading product's numbers change while someone is looking at them. When a
 * balance jumps from one value to another with no transition, the eye has no
 * way to tell an update from a re-render, and the reader has to re-read the
 * whole figure to find out what moved. Motion's job on this surface is to
 * carry continuity — this number *became* that number — not to decorate.
 *
 * Everything here therefore obeys three rules.
 *
 * **Animate from the previous value, never from zero.** A balance that counts
 * up from 0 on every navigation implies a change that did not happen, and on a
 * P&L figure it implies a loss followed by a recovery. The first render shows
 * the real number immediately; only subsequent changes animate.
 *
 * **Never animate what did not change.** A "live" pulse on a static figure is
 * a lie about market activity.
 *
 * **`prefers-reduced-motion` removes it entirely**, not "shortens it". Someone
 * who has asked their operating system to stop moving things has usually asked
 * for a medical reason, and a 40ms version of the same movement is still
 * movement.
 *
 * The durations come from the workstation's canonical scale — 80 / 140 / 180 /
 * 220 / 240ms — so the Hub and WariX feel like one product rather than two.
 */

export const MOTION = {
  instant: 0.08,
  fast: 0.14,
  standard: 0.18,
  panel: 0.22,
  major: 0.24,
  /** Long enough for a value to be readable in transit, short enough not to wait on. */
  figure: 0.55,
} as const;

/** The workstation's settle curve, expressed for `motion`. */
export const EASE_SETTLE = [0.22, 1, 0.36, 1] as const;
export const EASE_ENTER = [0.16, 0.84, 0.24, 1] as const;

/**
 * A number that moves to its new value instead of jumping to it.
 *
 * `format` is applied to the animating value on every frame, so a currency
 * figure stays a currency figure while it travels rather than briefly becoming
 * a raw float. The element carries the final text in `aria-label` and hides
 * the animating digits from assistive technology — a screen reader announcing
 * forty intermediate values of a balance is worse than no animation at all.
 */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(value);
  const [display, setDisplay] = useState(() => format(value));
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;

    if (reduced) {
      previous.current = value;
      setDisplay(format(value));
      return;
    }

    const controls = animate(motionValue, value, {
      duration: MOTION.figure,
      ease: EASE_SETTLE,
      onUpdate: (latest) => setDisplay(format(latest)),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, reduced, format, motionValue]);

  /*
   * The stable value is exposed as text, not as `aria-label`.
   *
   * `aria-label` on a bare `<span>` is prohibited — axe reports it as a
   * serious violation, and it is genuinely unreliable: a generic element with
   * no role has no accessible name to label. A visually hidden copy of the
   * final figure gives assistive technology one stable, correct reading while
   * the visible digits travel, instead of forty intermediate ones.
   */
  return (
    <span className={className}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true">{display}</span>
    </span>
  );
}

/**
 * Entrance for a group of cards, staggered.
 *
 * Only on first mount. Re-running it on every data refresh would make a
 * dashboard flicker its whole layout each time a number arrives, which is the
 * most common way "premium motion" turns into an unusable page.
 */
export function Stagger({
  children,
  className,
  step = 0.045,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  /**
   * The element to render.
   *
   * A list of staggered cards has to stay a list: wrapping each `<li>` in a
   * motion `<div>` puts a non-`li` child inside the `<ul>` and an `<li>`
   * outside one, which axe reports as a serious violation and a screen reader
   * resolves by guessing how many items there are.
   */
  as?: 'div' | 'ul';
}) {
  const reduced = useReducedMotion();
  const Tag = as;
  const Motion = as === 'ul' ? motion.ul : motion.div;
  if (reduced) return <Tag className={className}>{children}</Tag>;

  return (
    <Motion
      className={className}
      initial="hidden"
      animate="shown"
      variants={{ shown: { transition: { staggerChildren: step } } }}
    >
      {children}
    </Motion>
  );
}

/** One member of a `Stagger`. Also usable alone for a single reveal. */
export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  /** `li` when the stagger is a list — see the note on `Stagger`. */
  as?: 'div' | 'li';
}) {
  const reduced = useReducedMotion();
  const Tag = as;
  const Motion = as === 'li' ? motion.li : motion.div;
  if (reduced) return <Tag className={className}>{children}</Tag>;

  return (
    <Motion
      className={className}
      variants={{
        hidden: { opacity: 0, y: 8 },
        shown: { opacity: 1, y: 0, transition: { duration: MOTION.panel, ease: EASE_ENTER } },
      }}
    >
      {children}
    </Motion>
  );
}

/**
 * A progress bar that travels to its new fill.
 *
 * The track is the well; the fill is the value. `aria` lives on the wrapper so
 * the semantics are announced once, from the real numbers, regardless of what
 * the fill is doing visually.
 */
export function ProgressBar({
  percent,
  label,
  tone = 'indigo',
  height = 6,
  className,
}: {
  percent: number;
  label: string;
  tone?: ProgressTone;
  height?: number;
  className?: string;
}) {
  const reduced = useHydratedReducedMotion();
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={`w-full overflow-hidden rounded-full bg-[color:var(--wariba-track)] ${className ?? ''}`}
      style={{ height }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: TONE_FILL[tone] }}
        initial={reduced ? false : { width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={reduced ? { duration: 0 } : { duration: 0.6, ease: EASE_SETTLE }}
      />
    </div>
  );
}

export type ProgressTone = 'indigo' | 'emerald' | 'amber' | 'red' | 'copper' | 'cyan';

const TONE_FILL: Record<ProgressTone, string> = {
  indigo: 'var(--wariba-accent-indigo)',
  emerald: 'var(--wariba-accent-emerald)',
  amber: 'var(--wariba-accent-amber)',
  red: 'var(--wariba-accent-red)',
  copper: 'var(--wariba-accent-copper)',
  cyan: 'var(--wariba-accent-cyan)',
};

/**
 * A ring, for a single ratio that deserves more weight than a bar.
 *
 * Drawn with `strokeDasharray` on a circle rather than by an arc library: one
 * element, no dependency, and the animation is a single interpolated number
 * the browser handles on the compositor.
 */
export function ProgressRing({
  percent,
  label,
  tone = 'indigo',
  size = 96,
  thickness = 8,
  children,
}: {
  percent: number;
  label: string;
  tone?: ProgressTone;
  size?: number;
  thickness?: number;
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--wariba-track)"
          strokeWidth={thickness}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TONE_FILL[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduced ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          transition={reduced ? { duration: 0 } : { duration: 0.7, ease: EASE_SETTLE }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}

/**
 * The `LIVE` pill (reference 32).
 *
 * A dot that breathes and a label that does not. It appears only where data
 * genuinely streams — putting it on a static figure would be a claim about
 * market activity that is not true, which is the one thing motion must never
 * do on this product.
 */
export function LivePill({ label = 'EN DIRECT' }: { label?: string }) {
  const reduced = useHydratedReducedMotion();
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--commerce-accent-edge)] bg-[color:var(--commerce-accent-wash)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--wariba-color-cobalt-300)]">
      {reduced ? (
        <span className="size-1.5 rounded-full bg-[color:var(--wariba-color-cobalt-400)]" />
      ) : (
        <motion.span
          className="size-1.5 rounded-full bg-[color:var(--wariba-color-cobalt-400)]"
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {label}
    </span>
  );
}
