import type { AccountSummaryDTO } from '@wariba/application';

/**
 * Which account a `/trade` request resolves to.
 *
 * `accounts` is always the output of `listAccountsForUser` for the
 * **authenticated** user, so ownership is a property of the input, not a
 * check performed here: an account the caller does not own is not in the
 * list and therefore cannot be returned, whatever `requestedAccountId` says.
 * That is the whole IDOR defence, and it is why this function must never be
 * given a list built from anything other than the session's own user id.
 *
 * An unknown, foreign or malformed `?account=` falls through to the same
 * default as no parameter at all — `accounts[0]`, the first entry of the
 * canonical attention-first ordering `listAccountsForUser` already applies
 * and the Hub already defaults to. There is deliberately no separate notion
 * of "latest" or "tradable" here: a second definition of the default account
 * is exactly the drift W1 §6 forbids.
 *
 * Returns `null` only when the trader has no accounts at all.
 */
export function resolveWorkstationAccount(
  accounts: readonly AccountSummaryDTO[],
  requestedAccountId: string | undefined,
): AccountSummaryDTO | null {
  if (accounts.length === 0) return null;
  const requested = requestedAccountId
    ? accounts.find((candidate) => candidate.id === requestedAccountId)
    : undefined;
  return requested ?? (accounts[0] as AccountSummaryDTO);
}
