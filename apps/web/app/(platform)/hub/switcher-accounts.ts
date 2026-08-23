import { deriveAccountLifecycle, type AccountSummaryDTO } from '@wariba/application';
import type { SwitcherAccount } from './AccountSwitcher';

/**
 * Prepares accounts for the client switcher.
 *
 * The lifecycle derivation happens here, on the server, because
 * `@wariba/application`'s barrel re-exports read models that import `pg` — a
 * client component pulling that in drags a Postgres driver into the browser
 * bundle. It also belongs here on principle: the lifecycle is a projection of
 * authoritative state, and a client able to compute it is a client able to
 * compute it differently.
 */
export function toSwitcherAccounts(accounts: readonly AccountSummaryDTO[]): SwitcherAccount[] {
  return accounts.map((account) => {
    const lifecycle = deriveAccountLifecycle({
      accountStatus: account.status,
      programType: account.programType,
    });
    return { account, lifecycleLabel: lifecycle.label, lifecycleTone: lifecycle.tone };
  });
}
