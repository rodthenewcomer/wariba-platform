import { cx } from '../lib/cx';

export type RiskRibbonStatus =
  'normal' | 'attention' | 'near-limit' | 'soft-lock' | 'hard-breach' | 'stale';

export interface RiskRibbonProps {
  status: RiskRibbonStatus;
  /** Already formatted for display — this component does no math (Design System §48). */
  dailyLossRemaining: string;
  maximumLossRemaining: string;
  nextResetLabel: string;
  /** e.g. "Weekend dans 2h" or "Actualité à forte importance dans 90s" — omit when none. */
  restrictionLabel?: string;
  connectionOk: boolean;
}

// Label text always uses --wariba-text-primary (theme-aware: correct on both
// Hub's light surface and Trade's dark one). The colored dot carries the status
// color instead — tokens.json's status.*.text values are theme-independent
// (tuned for light backgrounds only), which broke AA contrast on dark Trade
// pages when used directly; confirmed via axe-core during Prompt 02 verification.
const STATUS_META: Record<RiskRibbonStatus, { label: string; accentVar: string }> = {
  normal: { label: 'Normal', accentVar: '--wariba-component-risk-ribbon-normal-accent' },
  attention: { label: 'Attention', accentVar: '--wariba-component-risk-ribbon-attention-accent' },
  'near-limit': {
    label: 'Proche limite',
    accentVar: '--wariba-component-risk-ribbon-attention-accent',
  },
  'soft-lock': {
    label: 'Blocage temporaire',
    accentVar: '--wariba-component-risk-ribbon-lock-accent',
  },
  'hard-breach': {
    label: 'Limite maximale dépassée',
    accentVar: '--wariba-component-risk-ribbon-lock-accent',
  },
  stale: {
    label: 'Données indisponibles',
    accentVar: '--wariba-component-risk-ribbon-stale-accent',
  },
};

/**
 * Design System §25.3 / UX Architecture §23 — permanent read on risk without
 * dominating the screen. Desktop: compact horizontal bar. Mobile: sticky block
 * under the header. Color alone never carries the meaning — label + icon do too
 * (Design System §41.4c / UX Architecture §46.3).
 */
export function RiskRibbon({
  status,
  dailyLossRemaining,
  maximumLossRemaining,
  nextResetLabel,
  restrictionLabel,
  connectionOk,
}: RiskRibbonProps) {
  const meta = STATUS_META[status];
  return (
    <div
      role="status"
      className={cx(
        'flex min-h-[var(--wariba-component-risk-ribbon-mobile-minimum-height)] flex-wrap items-center',
        'gap-x-[var(--wariba-component-risk-ribbon-gap)] gap-y-2 rounded-[var(--wariba-component-risk-ribbon-radius)]',
        'border-l-4 bg-[color:var(--wariba-background-surface)] px-[var(--wariba-component-risk-ribbon-padding-x)]',
        'py-2 md:h-[var(--wariba-component-risk-ribbon-desktop-height)] md:min-h-0',
      )}
      style={{ borderLeftColor: `var(${meta.accentVar})` }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: `var(${meta.accentVar})` }}
        aria-hidden="true"
      />
      <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
        {meta.label}
      </span>

      <span
        className="hidden h-4 w-px bg-[color:var(--wariba-border-subtle)] sm:inline-block"
        aria-hidden="true"
      />

      <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        Perte quotidienne restante&nbsp;
        <span className="wariba-data font-medium text-[color:var(--wariba-text-primary)]">
          {dailyLossRemaining}
        </span>
      </span>

      <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        Perte max. restante&nbsp;
        <span className="wariba-data font-medium text-[color:var(--wariba-text-primary)]">
          {maximumLossRemaining}
        </span>
      </span>

      <span className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        Reset {nextResetLabel}
      </span>

      {restrictionLabel ? (
        <span className="text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)]">
          {restrictionLabel}
        </span>
      ) : null}

      <span className="ml-auto flex items-center gap-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
        <span
          className={cx(
            'h-1.5 w-1.5 rounded-full',
            connectionOk
              ? 'bg-[color:var(--wariba-status-success-strong)]'
              : 'bg-[color:var(--wariba-status-warning-strong)]',
          )}
          aria-hidden="true"
        />
        {connectionOk ? 'Connecté' : 'Reconnexion…'}
      </span>
    </div>
  );
}
