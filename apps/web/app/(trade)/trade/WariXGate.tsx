import Link from 'next/link';

/**
 * WariX's entry gate.
 *
 * ## Why the workstation must never open empty
 *
 * A trading terminal with no account behind it is the worst first impression
 * the product can make: every control is inert, the chart has nothing to price
 * against, and the trader is left deciding whether the platform is broken or
 * they are. So the workstation does not mount at all without a tradable
 * account — this stands in its place and says exactly what is missing and what
 * to do about it.
 *
 * ## Why it is in the trade route and not the Hub
 *
 * The gate belongs to WariX's own boundary. A trader can reach `/trade`
 * directly — from a bookmark, from the phone tab bar, from a link — without
 * passing through the Hub, and a check that only exists on the way out of the
 * Hub is a check that can be walked around.
 *
 * Deliberately styled on the workstation's own material rather than the Hub's,
 * because this *is* WariX: the trader asked for the terminal and this is the
 * terminal answering.
 */
export function WariXGate({
  title,
  description,
  primary,
  secondary,
  meta,
}: {
  title: string;
  description: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  /** Account identity, when there is an account to name. */
  meta?: string;
}) {
  return (
    <div
      data-wariba-section="warix-gate"
      data-theme="dark"
      data-testid="warix-gate"
      className="relative flex min-h-dvh items-center justify-center bg-[color:var(--warix-shell)] px-5 py-12 text-[color:var(--wariba-text-primary)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(90% 60% at 50% 0%, rgba(46,86,168,0.18) 0%, rgba(46,86,168,0) 62%)',
        }}
      />

      <div className="relative w-full max-w-[32rem]">
        <Link
          href="/hub"
          className="mb-8 inline-flex items-center gap-2.5 rounded-[6px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)]"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[color:var(--wariba-component-workstation-wash-identity)] text-[length:var(--wariba-font-size-label-md)] font-extrabold leading-none text-[color:var(--wariba-accent-copper)] ring-1 ring-inset ring-[color:var(--wariba-accent-copper-edge)]"
          >
            W
          </span>
          <span className="text-[length:var(--wariba-font-size-label-lg)] font-bold tracking-[-0.01em]">
            WariX
          </span>
        </Link>

        <div className="rounded-[14px] border border-[color:var(--warix-border-subtle)] bg-[color:var(--warix-panel)] p-6 shadow-[inset_0_1px_0_0_var(--warix-highlight-inner),0_24px_60px_-32px_rgba(0,0,0,0.85)] sm:p-8">
          <h1 className="text-[length:var(--wariba-font-size-heading-lg)] font-bold leading-tight tracking-[-0.02em]">
            {title}
          </h1>
          <p className="mt-2.5 text-[length:var(--wariba-font-size-body-md)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
            {description}
          </p>

          {meta ? (
            <p className="wariba-data mt-4 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              {meta}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={primary.href}
              data-testid="warix-gate-primary"
              className="flex min-h-[48px] flex-1 items-center justify-center rounded-[10px] bg-[color:var(--wariba-accent-indigo)] px-5 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[#0B0D12] transition-[filter,transform] duration-[var(--wariba-component-workstation-motion-interaction)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] active:translate-y-px motion-reduce:transition-none"
            >
              {primary.label}
            </Link>
            <Link
              href={secondary.href}
              className="flex min-h-[48px] flex-1 items-center justify-center rounded-[10px] border border-[color:var(--warix-border-strong)] bg-[color:var(--warix-surface)] px-5 text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)] transition-colors duration-[var(--wariba-component-workstation-motion-interaction)] hover:bg-[color:var(--warix-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wariba-border-focus)] motion-reduce:transition-none"
            >
              {secondary.label}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
