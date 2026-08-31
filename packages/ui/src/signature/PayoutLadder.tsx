import { cx } from '../lib/cx';

export interface PayoutLadderStep {
  /** `Cycle 1`, `Cycle 2`… */
  label: string;
  /** `80 %` — pre-formatted; this component does no maths. */
  share: string;
  state: 'done' | 'current' | 'upcoming';
}

export interface PayoutLadderProps {
  steps: readonly PayoutLadderStep[];
  caption?: string;
  className?: string;
}

/**
 * The share ladder, drawn as steps that actually rise.
 *
 * A split schedule rendered as `80 / 80 / 85 / 85 / 90` in a table row is
 * information a reader has to assemble. Drawn as five columns of increasing
 * height, it is a shape — and the shape is the argument: staying longer pays
 * more.
 *
 * The active step is raised one level of surface rather than being outlined,
 * which is the same mechanism the material ladder uses everywhere else:
 * selection is a surface, never only a border colour.
 */
export function PayoutLadder({ steps, caption, className }: PayoutLadderProps) {
  return (
    <figure className={cx('m-0', className)}>
      <ol className="flex items-end gap-1 sm:gap-3">
        {steps.map((step, index) => {
          /* Height climbs with position so the ladder is legible even before
             the numbers are read. 58% floor keeps the first step tall enough
             to hold its label on a phone. */
          const height = 58 + (index / Math.max(1, steps.length - 1)) * 42;
          return (
            <li
              key={step.label}
              data-state={step.state}
              className="flex min-w-0 flex-1 flex-col justify-end"
              style={{ height: '9.5rem' }}
            >
              <div
                className={cx(
                  'relative flex flex-col justify-end rounded-t-[var(--wariba-radius-lg)] border border-b-0 px-1 pb-3 pt-3 text-center transition-colors sm:px-2',
                  step.state === 'current'
                    ? 'border-[color:var(--commerce-accent-edge)] bg-[color:var(--wariba-surface-2)] shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_-12px_36px_-18px_rgb(49_87_245/0.8)]'
                    : step.state === 'done'
                      ? 'border-[color:var(--commerce-rule)] bg-[color:var(--wariba-surface-1)]'
                      : 'border-[color:var(--commerce-rule)] bg-[color:color-mix(in_srgb,var(--wariba-surface-1)_55%,transparent)]',
                )}
                style={{ height: `${height}%` }}
              >
                <span
                  className={cx(
                    /* 13px at 320px: five steps plus their gaps have to fit
                       inside a 288px content column, and a percentage that
                       wraps is worse than one that is a size smaller. */
                    'font-mono text-[13px] font-bold tabular-nums sm:text-lg',
                    step.state === 'upcoming'
                      ? 'text-[color:var(--wariba-color-ink-300)]'
                      : 'text-[color:var(--wariba-color-ink-50)]',
                  )}
                >
                  {step.share}
                </span>
                {step.state === 'current' ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 top-0 h-px bg-[color:var(--wariba-color-cobalt-400)]"
                  />
                ) : null}
              </div>
              <span className="mt-2 truncate text-center text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-color-ink-300)]">
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      {caption ? (
        <figcaption className="mt-4 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-color-ink-300)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
