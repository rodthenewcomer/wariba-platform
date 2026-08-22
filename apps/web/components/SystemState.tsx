import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * WARIBA Product OS — the one surface every system state renders on.
 *
 * 404, 403, 500, offline and maintenance answer different questions but they
 * are the same moment for the person reading them: something did not work and
 * they need a way out. Giving each its own page is how a product ends up with
 * five different tones of voice for five variants of the same apology, and how
 * one of them quietly starts leaking what the restricted resource was.
 *
 * ## Why it is a composition and not centred text
 *
 * The first build put a heading and a paragraph in the middle of a black
 * viewport. That is not a state, it is a page that failed to load — nothing on
 * screen says which product the visitor is still inside, whether the platform
 * is broken or just this address, or that anyone is minding it. A failure is
 * the moment a product most needs to look owned.
 *
 * So the shell keeps the brand, and the state itself sits on a panel: brand
 * row, status capsule, title, one line, actions, and a support reference when
 * the backend supplied one. Every element is drawn from tone — no
 * illustration, because an illustration for an error is decoration on a moment
 * nobody wanted.
 */

export type SystemStateTone = 'neutral' | 'warning' | 'danger';

const TONE: Record<SystemStateTone, { mark: string; wash: string; ring: string }> = {
  neutral: {
    mark: 'var(--wariba-text-secondary)',
    wash: 'color-mix(in srgb, var(--warix-surface-raised) 82%, transparent)',
    ring: 'var(--warix-border-strong)',
  },
  warning: {
    mark: 'var(--wariba-component-workstation-trading-warning)',
    wash: 'color-mix(in srgb, var(--wariba-component-workstation-trading-warning) 12%, transparent)',
    ring: 'color-mix(in srgb, var(--wariba-component-workstation-trading-warning) 34%, transparent)',
  },
  danger: {
    mark: 'var(--wariba-component-workstation-trading-sell)',
    wash: 'color-mix(in srgb, var(--wariba-component-workstation-trading-sell) 12%, transparent)',
    ring: 'color-mix(in srgb, var(--wariba-component-workstation-trading-sell) 34%, transparent)',
  },
};

export interface SystemStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  /** Rendered in place of a link or button — used for controls that need their own client logic. */
  node?: ReactNode;
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

export const systemPrimaryActionClassName =
  'flex h-11 items-center justify-center rounded-[var(--wariba-component-input-radius)] bg-[color:var(--wariba-color-cobalt-600)] px-5 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-color-white)] transition-[filter,transform] duration-[var(--wariba-component-workstation-motion-interaction)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] active:translate-y-px motion-reduce:transition-none';

export const systemSecondaryActionClassName =
  'flex h-11 items-center justify-center rounded-[var(--wariba-component-input-radius)] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-surface)] px-5 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:border-[color:var(--warix-border-strong)] hover:bg-[color:var(--warix-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none';

export function SystemState({
  code,
  title,
  body,
  tone = 'neutral',
  actions = [],
  reference,
}: SystemStateProps) {
  const palette = TONE[tone];

  return (
    <div
      data-wariba-section="system-state"
      data-wariba-theme="system"
      data-theme="dark"
      data-testid={`system-state${code ? `-${code}` : ''}`}
      className="relative flex min-h-dvh flex-col bg-[color:var(--warix-shell)] px-5 py-6 text-[color:var(--wariba-text-primary)] sm:px-8"
    >
      {/* One cobalt light from above, so the panel sits in a space rather than
          on a void. Faint enough that it never becomes a gradient anyone
          notices as a gradient. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(90% 55% at 50% 0%, rgba(46,86,168,0.16) 0%, rgba(46,86,168,0) 62%)',
        }}
      />

      {/* Brand ownership. Whatever failed, the visitor is still inside a
          product, and the mark is the way back to the top of it. */}
      <header className="relative">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-[6px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[color:var(--wariba-component-workstation-wash-identity)] text-[length:var(--wariba-font-size-label-md)] font-extrabold leading-none text-[color:var(--wariba-component-workstation-identity-mark)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-identity-rule)]"
          >
            W
          </span>
          <span className="text-[length:var(--wariba-font-size-label-lg)] font-bold tracking-[-0.01em]">
            WARIBA
          </span>
        </Link>
      </header>

      <div className="relative flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[34rem]">
          <div className="rounded-[14px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-panel)] p-6 shadow-[inset_0_1px_0_0_var(--warix-highlight-inner),0_24px_60px_-32px_rgba(0,0,0,0.85)] sm:p-8">
            {/*
             * A capsule, not a 180px numeral.
             *
             * The status code is diagnostic information: useful to name the
             * state, never the headline. Giant "404" typography makes the
             * error the subject of the screen when the subject should be what
             * the person does next.
             */}
            <span
              className="inline-flex h-7 items-center gap-2 rounded-full px-3 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] ring-1 ring-inset"
              style={{
                background: palette.wash,
                color: palette.mark,
                ['--tw-ring-color' as string]: palette.ring,
              }}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: palette.mark }}
              />
              {/* The code when there is one; otherwise the state stands on its
                  own words — "Maintenance" has no HTTP status to quote. */}
              <span className="tabular-nums">{code ?? 'État système'}</span>
            </span>

            <h1 className="mt-5 text-[length:var(--wariba-font-size-heading-lg)] font-bold leading-tight tracking-[-0.02em]">
              {title}
            </h1>
            <p className="mt-2.5 text-[length:var(--wariba-font-size-body-md)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
              {body}
            </p>

            {actions.length > 0 ? (
              <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row">
                {actions.map((action, index) => {
                  if (action.node) return <div key={action.label}>{action.node}</div>;
                  const className =
                    index === 0 ? systemPrimaryActionClassName : systemSecondaryActionClassName;
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

          {/*
           * The support reference sits under the panel, not inside it.
           *
           * It is for the conversation that happens after this screen — a
           * value to quote to support — so it belongs at the footnote level.
           * It is a correlation id and nothing else: never a stack trace,
           * never an internal path, never a message from the exception.
           */}
          {reference ? (
            <p
              data-testid="system-state-reference"
              className="mt-4 select-all text-center text-[length:var(--wariba-font-size-body-sm)] tabular-nums text-[color:var(--wariba-text-tertiary)]"
            >
              {reference}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
