import type { PayoutLifecycleView } from '@wariba/application';
import { ActionLink } from '../../../components/hub/Action';
import { HubIcon } from '../../../components/hub/icons';
import { StatusPill } from '../../../components/hub/StatusPill';
import { Surface } from '../../../components/hub/Surface';

/**
 * The answer, before the form.
 *
 * A payout page that opens on an amount field is answering the wrong question.
 * Before "how much", a trader needs to know whether they can ask at all and —
 * if not — precisely what is in the way. `buildPayoutLifecycle` resolves that
 * from the same gate a submitted request is re-checked against, so what this
 * panel says and what the platform will do cannot disagree.
 *
 * ## The KYC moment
 *
 * When identity verification is the blocking reason, every trading criterion
 * has already been met — the trader has earned the payout. Rendering that as a
 * generic "not eligible" would be both false and, at the most important moment
 * the product has, demoralising. It gets its own state, its own colour and its
 * own action.
 */

const TONE_SURFACE = {
  neutral: 'default',
  progress: 'cyan',
  attention: 'amber',
  success: 'emerald',
  danger: 'red',
} as const;

const TONE_COLOR = {
  neutral: 'var(--wariba-text-secondary)',
  progress: 'var(--wariba-accent-cyan)',
  attention: 'var(--wariba-accent-amber)',
  success: 'var(--wariba-accent-emerald)',
  danger: 'var(--wariba-accent-red)',
} as const;

export function PayoutStatus({ payout }: { payout: PayoutLifecycleView }) {
  return (
    <Surface
      tone={TONE_SURFACE[payout.tone]}
      data-testid="payout-status"
      data-payout-state={payout.state}
      className="flex flex-col gap-4 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3.5">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
            style={{
              background: `color-mix(in srgb, ${TONE_COLOR[payout.tone]} 16%, transparent)`,
              color: TONE_COLOR[payout.tone],
            }}
          >
            <HubIcon
              role={
                payout.state === 'eligible_kyc_required'
                  ? 'identity'
                  : payout.awaitingPlatform
                    ? 'pending'
                    : payout.tone === 'success'
                      ? 'success'
                      : 'payouts'
              }
              size={22}
              active
            />
          </span>
          <div className="min-w-0">
            <p className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              {payout.label}
            </p>
            <p className="mt-1 max-w-[58ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
              {payout.description}
            </p>
            {/* Said once, here. A separate "what's left to do" panel repeated
                this sentence verbatim, which reads as the page not knowing
                what it already told you. */}
            {payout.blockingReason ? (
              <p className="mt-2 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                Cette condition est réévaluée en continu — vous n’avez rien à rafraîchir.
              </p>
            ) : null}
          </div>
        </div>

        {payout.actionHref && payout.actionLabel ? (
          <ActionLink href={payout.actionHref} size="sm" data-testid="payout-action">
            {payout.actionLabel}
          </ActionLink>
        ) : null}
      </div>

      {/* The identity gate is stated even when it is not the blocker, so a
          trader knows it is coming rather than meeting it at the last step. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color:var(--warix-border-subtle)] pt-4">
        <span className="flex items-center gap-2 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
          Vérification d’identité
          <StatusPill tone={payout.kyc.state === 'verified' ? 'success' : 'attention'} size="sm">
            {payout.kyc.label}
          </StatusPill>
        </span>
        {payout.kyc.state !== 'verified' ? (
          <ActionLink href="/verification-identite" variant="ghost" size="sm">
            Voir le détail
          </ActionLink>
        ) : null}
      </div>
    </Surface>
  );
}
