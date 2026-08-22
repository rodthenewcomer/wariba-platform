import Link from 'next/link';
import type { ReactNode } from 'react';
import { productCopy } from '../../lib/product-copy';
import { AuthVisual } from './AuthVisual';
import { AuthStatusMark, type AuthStatusMarkTone } from './AuthStatusMark';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Links and secondary actions, below the form. */
  footer?: ReactNode;
  /**
   * Outcome screens — verified, sent, updated, expired — state their result
   * with a mark before they state it in words. Forms never take one: a glyph
   * above a login field is decoration on a screen that has a job to do.
   */
  mark?: AuthStatusMarkTone;
}

/**
 * The authentication shell.
 *
 * Auth belongs to the same product family as the WariX workstation but is not
 * the workstation: the terminal is dense because a trader is working, and this
 * screen is calm because they are arriving. Same graphite, same cobalt, same
 * typography — more air, larger type, one thing to do.
 *
 * ## Proportion
 *
 * 58/42 rather than half and half. The visual side carries a composition and
 * needs room to breathe; the form side carries a 440px column and gains
 * nothing from being wider, so the extra width would become margin. Below
 * `lg` the brand pane is dropped entirely rather than squeezed into a strip —
 * a shrunken desktop composition is worse on a phone than no composition.
 *
 * ## Vertical rhythm
 *
 * The column centres itself only when there is a pane beside it to centre
 * against. On a phone it starts under the brand row and stays there: the
 * earlier build centred at every width, which floated a short login form far
 * down a 390px screen with the brand stranded at the top and nothing between
 * them. Top-aligned is also what keeps a submit button reachable once the
 * keyboard is open.
 */
export function AuthShell({ title, subtitle, children, footer, mark }: AuthShellProps) {
  return (
    <div
      data-wariba-section="auth"
      /*
       * The whole segment runs on the dark palette, the same way the trade
       * shell does. Declaring it here rather than hand-picking dark values per
       * element is what makes every design-system primitive — Input, Button,
       * Alert, Text — resolve correctly without knowing it is on a dark screen.
       *
       * The first render of this page proved the point: dark backgrounds with
       * default (light) text tokens produced invisible field labels, an
       * invisible heading and white inputs on graphite.
       */
      data-wariba-theme="auth"
      data-theme="dark"
      className="grid min-h-dvh grid-cols-1 bg-[color:var(--warix-shell)] text-[color:var(--wariba-text-primary)] lg:grid-cols-[58fr_42fr]"
    >
      <AuthVisual />

      <div className="flex min-w-0 flex-col">
        {/* Compact brand header for the single-column layout, where the visual
            pane is gone and the screen would otherwise open on a bare form. */}
        <header className="flex items-center justify-between px-5 pt-6 sm:px-8 lg:hidden">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-[6px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[color:var(--wariba-component-workstation-wash-identity)] text-[length:var(--wariba-font-size-label-md)] font-extrabold leading-none text-[color:var(--wariba-component-workstation-identity-mark)] ring-1 ring-inset ring-[color:var(--wariba-component-workstation-identity-rule)]"
            >
              W
            </span>
            <span className="text-[length:var(--wariba-font-size-label-lg)] font-bold tracking-[-0.01em] text-[color:var(--wariba-text-primary)]">
              {productCopy.auth.brand.name}
            </span>
          </Link>
          <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            {productCopy.auth.brand.truths[0]}
          </span>
        </header>

        <main
          data-testid="auth-form-column"
          className="flex flex-1 items-start justify-center px-5 pb-12 pt-7 sm:px-8 lg:items-center lg:px-14 lg:py-10"
        >
          <div className="w-full max-w-[var(--auth-form-max)]">
            <div className="mb-7">
              {mark ? <AuthStatusMark tone={mark} /> : null}
              <h1
                className="font-bold tracking-[-0.02em] text-[color:var(--wariba-text-primary)]"
                style={{
                  fontSize: 'var(--auth-title-size)',
                  lineHeight: 'var(--auth-title-line)',
                }}
              >
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2.5 text-[length:var(--wariba-font-size-body-md)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {children}

            {footer ? <div className="mt-7">{footer}</div> : null}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * The secondary line under a form — "already have an account?", "back to sign
 * in". One component so every auth page places it identically instead of each
 * inventing its own spacing.
 */
export function AuthFooterLink({
  prompt,
  href,
  label,
}: {
  prompt?: string;
  href: string;
  label: string;
}) {
  return (
    <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
      {prompt ? <span>{prompt} </span> : null}
      <Link
        href={href}
        className="rounded-[4px] font-semibold text-[color:var(--wariba-text-primary)] underline decoration-[color:var(--warix-border-strong)] underline-offset-4 transition-colors hover:decoration-[color:var(--warix-accent-cobalt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
      >
        {label}
      </Link>
    </p>
  );
}

/**
 * The raised panel an outcome screen sits its action on.
 *
 * Verification, recovery and expiry pages have one sentence and one button, so
 * without a surface under them they read as text abandoned on a canvas. One
 * step up the material ladder is enough; a card with a shadow would make a
 * confirmation look like a modal.
 */
export function AuthPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 rounded-[12px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-panel)] p-5 shadow-[inset_0_1px_0_0_var(--warix-highlight-inner)]">
      {children}
    </div>
  );
}
