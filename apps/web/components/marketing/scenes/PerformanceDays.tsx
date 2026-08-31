'use client';

import { useEffect, useState } from 'react';
import { cx } from '@wariba/ui';
import { useHydratedReducedMotion } from '../../motion/useHydratedReducedMotion';

export interface PerformanceDaysProps {
  /** How many days a cycle requires. Server-derived. */
  required: number;
  /** The gain that qualifies a day, pre-formatted. */
  thresholdLabel: string;
  /**
   * Set when this sits on a filled cobalt surface.
   *
   * The default palette is cobalt-on-graphite, and dropped onto an accent tile
   * it became cobalt-on-cobalt: the filled days vanished and only the *empty*
   * slots stayed visible, which inverted the entire meaning of the component.
   * On accent, filled is white and empty is a dark wash.
   */
  onAccent?: boolean;
  className?: string;
}

/**
 * The Performance Days, filling.
 *
 * Five slots, filling one at a time, cobalt while the cycle is open and
 * emerald once it completes. Emerald is reserved for achievement everywhere in
 * this system, so the colour change *is* the message: the cycle is done, the
 * payout is open.
 *
 * The loop pauses on the full state twice as long as on the others. A ladder
 * that resets the instant it completes never lets anyone see the thing it was
 * counting towards.
 */
export function PerformanceDays({
  required,
  thresholdLabel,
  onAccent = false,
  className,
}: PerformanceDaysProps) {
  const reduced = useHydratedReducedMotion();
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    if (reduced) {
      setFilled(required);
      return;
    }
    let step = 0;
    const advance = () => {
      step = (step + 1) % (required + 2);
      setFilled(Math.min(step, required));
    };
    const timer = window.setInterval(advance, 900);
    return () => window.clearInterval(timer);
  }, [reduced, required]);

  const complete = filled >= required;

  return (
    <div className={cx('w-full', className)}>
      <div
        className="flex items-center gap-2.5"
        role="img"
        aria-label={`${filled} journées performance sur ${required}`}
      >
        {Array.from({ length: required }, (_, index) => {
          const on = index < filled;
          return (
            <span
              key={index}
              className="h-2.5 flex-1 rounded-full transition-colors duration-[var(--wariba-motion-state)]"
              style={{
                background: on
                  ? onAccent
                    ? '#FFFFFF'
                    : complete
                      ? 'var(--wariba-accent-emerald)'
                      : 'var(--wariba-brand-500)'
                  : onAccent
                    ? 'rgb(0 0 0 / 0.28)'
                    : 'var(--wariba-track)',
                boxShadow:
                  on && !onAccent
                    ? `0 0 16px -4px ${complete ? 'rgb(54 179 126 / 0.7)' : 'rgb(49 87 245 / 0.7)'}`
                    : 'none',
              }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <p
          className={cx(
            'wariba-figure text-sm',
            onAccent ? 'text-white' : 'text-[color:var(--wariba-on-dark)]',
          )}
        >
          {filled}
          <span className={onAccent ? 'text-white/60' : 'text-[color:var(--wariba-on-dark-dim)]'}>
            /{required}
          </span>
        </p>
        <p
          className={cx(
            'text-sm',
            onAccent ? 'text-white/80' : 'text-[color:var(--wariba-on-dark-dim)]',
          )}
        >
          {complete ? 'Cycle complet' : `Une journée compte à partir de ${thresholdLabel}`}
        </p>
      </div>
    </div>
  );
}
