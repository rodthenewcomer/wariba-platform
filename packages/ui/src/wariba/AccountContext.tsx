import { Badge } from '../components/Badge';

export type AccountProgram = 'WARIBA ONE' | 'WARIBA Performance';

export interface AccountContextProps {
  program: AccountProgram;
  /** e.g. "10 000 USD" */
  nominalFormatted: string;
  publicId: string;
  statusLabel: string;
  statusVariant: 'neutral' | 'information' | 'success' | 'warning' | 'danger';
}

/**
 * Design System §25.1 / UX Architecture §12.3-12.4 — visible before any sensitive
 * action, and repeated at confirmation so a trader never acts on the wrong account.
 * Always states the simulated nature explicitly (Rulebook §43.3).
 */
export function AccountContext({
  program,
  nominalFormatted,
  publicId,
  statusLabel,
  statusVariant,
}: AccountContextProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[var(--wariba-radius-md)] border border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-subtle)] px-[var(--wariba-space-3)] py-[var(--wariba-space-2)]">
      <span className="text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-primary)]">
        {program}
      </span>
      <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
        {nominalFormatted}
      </span>
      <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
        {publicId}
      </span>
      <Badge variant={statusVariant}>{statusLabel}</Badge>
      <span className="ml-auto text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        Compte simulé — nominal non détenu
      </span>
    </div>
  );
}
