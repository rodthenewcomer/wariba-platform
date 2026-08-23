import type { PayoutLifecycleView } from '@wariba/application';
import { ActionLink } from '../../../components/hub/Action';
import { Surface } from '../../../components/hub/Surface';
import { ProgressBar } from '../../../components/motion/primitives';

/**
 * What a funded account is actually for.
 *
 * ## Why this sits above the mission on a Performance account
 *
 * §10.3. An evaluation account's question is "will I pass". A Performance
 * account has already passed, and its question is "how much can I take out,
 * and what is standing between me and it". Rendering the two programmes in the
 * same order makes the funded dashboard look like the evaluation card with a
 * different badge, which is exactly the failure the phase brief calls out.
 *
 * ## Why the blocked case is not a greyed-out button
 *
 * `payout-lifecycle.ts` already distinguishes twelve states and produces a
 * specific French sentence for every blocking reason. "You are not eligible"
 * with a disabled control throws all of that away at the moment it matters
 * most — a trader who is 400 USD below the buffer and one who has not
 * verified their identity need different next actions, and the read model
 * knows which. So the amount is always shown, the reason is always named, and
 * the action is whatever unblocks *this* trader.
 */
export function PayoutSummary({
  payout,
  accountId,
}: {
  payout: PayoutLifecycleView;
  accountId: string;
}) {
  const cycle = payout.cycle;
  if (!cycle) return null;

  const ready = payout.state === 'request_ready';
  const daysPercent =
    cycle.performanceDaysRequired > 0
      ? Math.min(
          100,
          Math.round((cycle.performanceDaysCompleted / cycle.performanceDaysRequired) * 100),
        )
      : 100;

  return (
    <Surface
      tone={ready ? 'emerald' : 'default'}
      className="flex flex-col gap-5 p-5 sm:p-6"
      data-testid="payout-summary"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
            Disponible maintenant
          </p>
          <p
            className="wariba-data mt-1.5 text-[30px] font-semibold leading-none tracking-[-0.02em]"
            style={{
              color: ready ? 'var(--wariba-accent-emerald)' : 'var(--wariba-text-primary)',
            }}
            data-testid="payout-available"
          >
            {cycle.availableFormatted}
          </p>
          <p className="mt-1.5 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
            au-dessus du buffer permanent
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2">
          {payout.actionLabel && payout.actionHref ? (
            <ActionLink
              href={payout.actionHref}
              size="md"
              variant={ready ? 'primary' : 'secondary'}
              data-testid="payout-action"
            >
              {payout.actionLabel}
            </ActionLink>
          ) : (
            <ActionLink href={`/payouts?account=${accountId}`} size="md" variant="secondary">
              Voir le Payout Center
            </ActionLink>
          )}
        </div>
      </div>

      {/*
       * The reason, always named. `blockingReason` is a full French sentence
       * from the read model, not a rejection code — the schema never talks to
       * the trader directly.
       */}
      {payout.blockingReason ? (
        <p
          className="rounded-[8px] px-3.5 py-2.5 text-[length:var(--wariba-font-size-body-sm)]"
          style={{
            background: 'var(--wariba-accent-amber-wash)',
            color: 'var(--wariba-text-secondary)',
          }}
          data-testid="payout-blocking-reason"
        >
          {payout.blockingReason}
        </p>
      ) : null}

      <div className="grid gap-5 border-t border-[color:var(--warix-border-subtle)] pt-5 sm:grid-cols-2">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              Buffer permanent
            </span>
            <span className="wariba-data text-[length:var(--wariba-font-size-label-lg)] font-semibold text-[color:var(--wariba-text-primary)]">
              {cycle.bufferProgressPercent} %
            </span>
          </div>
          <p className="wariba-data mt-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]">
            {cycle.realizedBalanceFormatted}
            <span className="text-[color:var(--wariba-text-tertiary)]">
              {' '}
              / plancher {cycle.bufferFloorFormatted}
            </span>
          </p>
          <ProgressBar
            percent={cycle.bufferProgressPercent}
            label={`Buffer permanent — ${cycle.realizedBalanceFormatted} sur ${cycle.bufferFloorFormatted}`}
            tone={cycle.bufferProgressPercent >= 100 ? 'emerald' : 'indigo'}
            className="mt-2"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
              Performance Days
            </span>
            <span className="wariba-data text-[length:var(--wariba-font-size-label-lg)] font-semibold text-[color:var(--wariba-text-primary)]">
              {cycle.performanceDaysCompleted} / {cycle.performanceDaysRequired}
            </span>
          </div>
          <p className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
            Cycle n°{cycle.cycleNumber}
          </p>
          <ProgressBar
            percent={daysPercent}
            label={`Performance Days — ${cycle.performanceDaysCompleted} sur ${cycle.performanceDaysRequired}`}
            tone={daysPercent >= 100 ? 'emerald' : 'indigo'}
            className="mt-2"
          />
        </div>
      </div>

      {/*
       * The identity gate, stated whenever it is not already cleared. A trader
       * who completes every trading condition and then discovers an unstarted
       * KYC step has been failed by the surface, not by the rule.
       */}
      {payout.kyc.state !== 'verified' ? (
        <p className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
          Vérification d’identité : <span>{payout.kyc.label}</span>
          {' · '}
          <a
            href="/verification-identite"
            className="text-[color:var(--wariba-accent-indigo)] underline-offset-4 hover:underline"
          >
            Ouvrir
          </a>
        </p>
      ) : null}
    </Surface>
  );
}
