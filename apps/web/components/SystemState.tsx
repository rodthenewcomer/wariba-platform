import Link from 'next/link';

/**
 * WARIBA Product OS — the one surface every system state renders on.
 *
 * 404, 403, 500, offline and maintenance answer different questions but they
 * are the same moment for the person reading them: something did not work and
 * they need a way out. Giving each its own page is how a product ends up with
 * five different tones of voice for five variants of the same apology, and how
 * one of them quietly starts leaking what the restricted resource was.
 *
 * So the layout, spacing and action placement live here once, and each state
 * supplies only its words. The mark at the top is drawn from the state's own
 * tone rather than an illustration, because an illustration for an error is
 * decoration on a moment nobody wanted.
 */

export type SystemStateTone = 'neutral' | 'warning' | 'danger';

const TONE_RING: Record<SystemStateTone, string> = {
  neutral: 'var(--warix-border-strong)',
  warning: 'var(--wariba-component-workstation-trading-warning)',
  danger: 'var(--wariba-component-workstation-trading-sell)',
};

export interface SystemStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface SystemStateProps {
  code?: string;
  title: string;
  body: string;
  tone?: SystemStateTone;
  actions?: SystemStateAction[];
  /** Support reference when one exists. Never a stack trace or an internal path. */
  reference?: string;
}

export function SystemState({
  code,
  title,
  body,
  tone = 'neutral',
  actions = [],
  reference,
}: SystemStateProps) {
  return (
    <div
      data-wariba-section="system-state"
      data-wariba-theme="system"
      data-theme="dark"
      data-testid={`system-state${code ? `-${code}` : ''}`}
      className="flex min-h-dvh items-center justify-center bg-[color:var(--warix-shell)] px-5 py-12 text-[color:var(--wariba-text-primary)]"
    >
      <div className="w-full max-w-[30rem] text-center">
        {code ? (
          <span
            aria-hidden="true"
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[14px] bg-[color:var(--warix-surface)] text-[length:var(--wariba-font-size-label-lg)] font-bold tabular-nums text-[color:var(--wariba-text-secondary)] ring-1 ring-inset"
            style={{ ['--tw-ring-color' as string]: TONE_RING[tone] }}
          >
            {code}
          </span>
        ) : null}

        <h1 className="text-[length:var(--wariba-font-size-heading-lg)] font-bold leading-tight tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mt-3 text-[length:var(--wariba-font-size-body-md)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
          {body}
        </p>

        {reference ? (
          <p className="mt-4 text-[length:var(--wariba-font-size-body-sm)] tabular-nums text-[color:var(--wariba-text-tertiary)]">
            {reference}
          </p>
        ) : null}

        {actions.length > 0 ? (
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            {actions.map((action, index) => {
              const primary = index === 0;
              const className = primary
                ? 'flex h-11 items-center justify-center rounded-[var(--wariba-component-input-radius)] bg-[color:var(--wariba-color-cobalt-600)] px-5 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-color-white)] transition-[filter,transform] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] active:translate-y-px'
                : 'flex h-11 items-center justify-center rounded-[var(--wariba-component-input-radius)] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface)] px-5 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)] transition-colors hover:border-[color:var(--warix-border-strong)] hover:bg-[color:var(--warix-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]';

              return action.href ? (
                <Link key={action.label} href={action.href} className={className}>
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={className}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
