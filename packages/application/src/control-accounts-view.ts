import { CONTROL_ACCOUNTS_PAGE_SIZE, type ControlAccountFilters } from '@wariba/database';

/**
 * Prompt 09 — parses the Accounts explorer's URL query.
 *
 * Same contract as the audit explorer: filters live in the URL so a view can
 * be shared and reloaded, every value therefore arrives as untrusted text,
 * and anything unusable is dropped and reported rather than forwarded. The
 * enum filters matter most here — `status=' OR 1=1` or simply `status=foo`
 * must never reach a column typed to a fixed set, and a dropped value must
 * never sit in the form looking as though it narrowed anything.
 */
export const ACCOUNT_PROGRAMS = ['WARIBA_ONE', 'WARIBA_PERFORMANCE'] as const;

export const ACCOUNT_STATUSES = [
  'pending_activation',
  'active',
  'soft_locked',
  'pass_pending',
  'inactive',
  'passed',
  'breached',
  'closed',
] as const;

export type AccountSearchParams = Record<string, string | string[] | undefined>;

export interface AccountQuery {
  filters: ControlAccountFilters;
  page: number;
  /** Parameters supplied but rejected, by name — see AuditQuery.ignored. */
  ignored: readonly string[];
}

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseAccountQuery(params: AccountSearchParams): AccountQuery {
  const ignored: string[] = [];
  const reject = (key: string): void => {
    if (first(params[key]) !== undefined) ignored.push(key);
  };

  const filters: ControlAccountFilters = {};

  const query = first(params.q);
  if (query) filters.query = query;

  const program = first(params.program);
  if (program && (ACCOUNT_PROGRAMS as readonly string[]).includes(program)) {
    filters.program = program as (typeof ACCOUNT_PROGRAMS)[number];
  } else if (program) {
    reject('program');
  }

  const status = first(params.status);
  if (status && (ACCOUNT_STATUSES as readonly string[]).includes(status)) {
    filters.status = status as (typeof ACCOUNT_STATUSES)[number];
  } else if (status) {
    reject('status');
  }

  // Nominal balance is a numeric column: a non-numeric value is an error,
  // not an empty result.
  const nominal = first(params.nominal);
  if (nominal && /^\d+(\.\d{1,2})?$/.test(nominal)) filters.nominalBalance = nominal;
  else if (nominal) reject('nominal');

  const hold = first(params.hold);
  if (hold === 'true') filters.integrityHold = true;
  else if (hold === 'false') filters.integrityHold = false;
  else if (hold) reject('hold');

  const payout = first(params.payout);
  if (payout === 'pending') filters.payoutPending = true;
  else if (payout) reject('payout');

  const rawPage = first(params.page);
  const page = rawPage && /^\d+$/.test(rawPage) ? Math.max(1, Number.parseInt(rawPage, 10)) : 1;
  if (rawPage && !/^\d+$/.test(rawPage)) reject('page');

  return { filters, page, ignored };
}

export function accountPageHref(params: AccountSearchParams, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'page') continue;
    const single = first(value);
    if (single) search.set(key, single);
  }
  if (page > 1) search.set('page', String(page));
  const query = search.toString();
  return query ? `/control/accounts?${query}` : '/control/accounts';
}

export function accountTotalPages(total: number, pageSize = CONTROL_ACCOUNTS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export const ACCOUNT_FILTER_LABELS: Record<string, string> = {
  program: 'Programme',
  status: 'Statut',
  nominal: 'Nominal',
  hold: 'Integrity hold',
  payout: 'Payout',
  page: 'Page',
};
