import type { LinkComponentType } from '../lib/link';
import { cx } from '../lib/cx';

export interface AccountSelectorItem {
  id: string;
  href: string;
  program: 'WARIBA ONE' | 'WARIBA Performance';
  nominalFormatted: string;
  publicId: string;
  statusLabel: string;
  statusVariant: 'neutral' | 'information' | 'success' | 'warning' | 'danger';
}

export interface AccountSelectorProps {
  LinkComponent: LinkComponentType;
  accounts: readonly AccountSelectorItem[];
  activeAccountId: string;
}

const STATUS_DOT: Record<AccountSelectorItem['statusVariant'], string> = {
  neutral: 'bg-[color:var(--wariba-status-neutral-text)]',
  information: 'bg-[color:var(--wariba-status-information-text)]',
  success: 'bg-[color:var(--wariba-status-success-text)]',
  warning: 'bg-[color:var(--wariba-status-warning-text)]',
  danger: 'bg-[color:var(--wariba-status-danger-text)]',
};

/**
 * UX Architecture §12.3/§20.5 — persistent account switcher: type, taille,
 * identifiant, état, jamais de métriques fusionnées entre comptes.
 * Switching is always an explicit navigation, never a silent state flip —
 * WARIBA must never execute an action against the wrong account.
 */
export function AccountSelector({
  LinkComponent: Link,
  accounts,
  activeAccountId,
}: AccountSelectorProps) {
  if (accounts.length <= 1) return null;

  return (
    <nav aria-label="Changer de compte" className="flex flex-col gap-1.5">
      {accounts.map((account) => {
        const active = account.id === activeAccountId;
        return (
          <Link
            key={account.id}
            href={account.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[var(--wariba-radius-md)] border',
              'px-[var(--wariba-space-3)] py-[var(--wariba-space-2)] transition-colors',
              active
                ? 'border-[color:var(--wariba-border-focus)] bg-[color:var(--wariba-background-selected)]'
                : 'border-[color:var(--wariba-border-subtle)] bg-[color:var(--wariba-background-surface)] hover:border-[color:var(--wariba-border-default)]',
            )}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cx('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[account.statusVariant])}
              />
              <span className="text-[length:var(--wariba-font-size-body-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
                {account.program}
              </span>
              <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                {account.publicId}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                {account.nominalFormatted}
              </span>
              <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                {account.statusLabel}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
