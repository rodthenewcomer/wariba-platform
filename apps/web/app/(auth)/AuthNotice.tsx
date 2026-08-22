import type { ReactNode } from 'react';

/**
 * The one surface an auth screen uses to say something went wrong — or right.
 *
 * The design-system `Alert` is built for a dense workstation where a notice
 * competes with a dozen panels for attention. On a screen holding one form and
 * one decision it arrives oversized, and the failure of a password field ends
 * up looking like a system incident.
 *
 * So this is deliberately smaller and quieter: a semantic mark, a title, one
 * line of explanation, a hairline border and a wash of the state's own colour.
 * It reveals in 160ms and it does not shake, flash, bounce or pulse. Someone
 * mistyping a password has already noticed; the interface does not need to
 * perform the discovery for them.
 *
 * Local to the auth segment on purpose — the workstation keeps `Alert`, and
 * neither surface inherits a compromise made for the other.
 */

export type AuthNoticeTone = 'danger' | 'information' | 'success';

const TONE: Record<
  AuthNoticeTone,
  { border: string; wash: string; mark: string; icon: ReactNode }
> = {
  danger: {
    border: 'var(--wariba-status-danger-border)',
    wash: 'color-mix(in srgb, var(--wariba-component-workstation-trading-sell) 10%, transparent)',
    mark: 'var(--wariba-component-workstation-trading-sell)',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.25" />
        <path d="M12 16.4h.01" />
      </>
    ),
  },
  information: {
    border: 'var(--wariba-status-information-border)',
    wash: 'color-mix(in srgb, var(--warix-accent-cobalt) 10%, transparent)',
    mark: 'var(--warix-accent-cobalt)',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5.5" />
        <path d="M12 7.6h.01" />
      </>
    ),
  },
  success: {
    border: 'var(--wariba-status-success-border)',
    wash: 'color-mix(in srgb, var(--wariba-component-workstation-trading-buy) 10%, transparent)',
    mark: 'var(--wariba-component-workstation-trading-buy)',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
      </>
    ),
  },
};

export interface AuthNoticeProps {
  tone?: AuthNoticeTone;
  title: string;
  children?: ReactNode;
}

export function AuthNotice({ tone = 'danger', title, children }: AuthNoticeProps) {
  const style = TONE[tone];

  return (
    <div
      // `alert` for failures so a screen reader announces them without the
      // person having to go looking; `status` for the calmer states, which
      // should not interrupt what is being typed.
      role={tone === 'danger' ? 'alert' : 'status'}
      data-testid="auth-notice"
      data-tone={tone}
      className="wariba-reveal flex gap-3 rounded-[10px] border p-3.5"
      style={{ borderColor: style.border, background: style.wash }}
    >
      <svg
        aria-hidden="true"
        className="mt-px shrink-0"
        fill="none"
        height="19"
        stroke={style.mark}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
        viewBox="0 0 24 24"
        width="19"
      >
        {style.icon}
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--wariba-font-size-label-md)] font-semibold leading-snug text-[color:var(--wariba-text-primary)]">
          {title}
        </p>
        {children ? (
          <div className="mt-1 text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
