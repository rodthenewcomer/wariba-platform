import Link from 'next/link';
import type { ReactNode } from 'react';
import { productCopy } from '../../lib/product-copy';
import { AuthVisual } from './AuthVisual';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Links and secondary actions, below the form. */
  footer?: ReactNode;
}

/**
 * The authentication shell.
 *
 * Auth belongs to the same product family as the WariX workstation but is not
 * the workstation: the terminal is dense because a trader is working, and this
 * screen is calm because they are arriving. Same graphite, same cobalt, same
 * typography — more air, larger type, one thing to do.
 *
 * The split is roughly 55/45 rather than 50/50 so the form column stays a
 * column and not a half-page, and the brand side collapses entirely below
 * `lg` rather than being squeezed into a strip. A shrunken desktop composition
 * is worse on a phone than no composition at all.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
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
      className="grid min-h-dvh grid-cols-1 bg-[color:var(--warix-shell)] text-[color:var(--wariba-text-primary)] lg:grid-cols-[55fr_45fr] xl:grid-cols-[57fr_43fr]"
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
        </header>

        {/*
         * `justify-center` on tall viewports, top-aligned once the content
         * outgrows the screen — a form that centres itself while the keyboard
         * is open pushes its own submit button out of reach on a phone.
         */}
        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-[26rem]">
            <div className="mb-7">
              <h1 className="text-[length:var(--wariba-font-size-heading-lg)] font-bold leading-tight tracking-[-0.02em] text-[color:var(--wariba-text-primary)]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-[length:var(--wariba-font-size-body-md)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
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
