import type { ControlPayoutFilters } from '@wariba/database';

/**
 * Prompt 09 milestone 4 — parses the payout queue's URL query.
 *
 * Same contract as the other explorers: filters live in the URL so a review
 * can be shared and reloaded, every value is untrusted, and anything
 * unusable is dropped *and reported* rather than forwarded. The enum
 * filters matter most — `status` and `provider_status` are checked columns,
 * so an unknown value is an error rather than an empty result.
 */
export const PAYOUT_STATUSES = [
  'pending_review',
  'needs_information',
  'approved',
  'rejected',
  'processing',
  'paid',
  'failed',
  'cancelled',
  'reversed',
] as const;

export const PAYOUT_PROVIDER_STATUSES = [
  'pending',
  'processing',
  'paid',
  'failed',
  'returned',
] as const;

export type PayoutSearchParams = Record<string, string | string[] | undefined>;

export interface PayoutQuery {
  filters: ControlPayoutFilters;
  page: number;
  ignored: readonly string[];
}

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function parseDate(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
    : value;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function parsePayoutQuery(params: PayoutSearchParams): PayoutQuery {
  const ignored: string[] = [];
  const reject = (key: string): void => {
    if (first(params[key]) !== undefined) ignored.push(key);
  };

  const filters: ControlPayoutFilters = {};

  const query = first(params.q);
  if (query) filters.query = query;

  const status = first(params.status);
  if (status && (PAYOUT_STATUSES as readonly string[]).includes(status)) {
    filters.status = status as (typeof PAYOUT_STATUSES)[number];
  } else if (status) reject('status');

  const providerStatus = first(params.provider);
  if (providerStatus && (PAYOUT_PROVIDER_STATUSES as readonly string[]).includes(providerStatus)) {
    filters.providerStatus = providerStatus as (typeof PAYOUT_PROVIDER_STATUSES)[number];
  } else if (providerStatus) reject('provider');

  // Cycles are 1–5 by database constraint; anything else cannot match.
  const cycle = first(params.cycle);
  if (cycle && /^[1-5]$/.test(cycle)) filters.cycleNumber = Number.parseInt(cycle, 10);
  else if (cycle) reject('cycle');

  const nominal = first(params.nominal);
  if (nominal && /^\d+(\.\d{1,2})?$/.test(nominal)) filters.nominalBalance = nominal;
  else if (nominal) reject('nominal');

  const kyc = first(params.kyc);
  if (kyc === 'true') filters.kycVerified = true;
  else if (kyc === 'false') filters.kycVerified = false;
  else if (kyc) reject('kyc');

  const method = first(params.method);
  if (method === 'true') filters.payoutMethodConfigured = true;
  else if (method === 'false') filters.payoutMethodConfigured = false;
  else if (method) reject('method');

  const from = parseDate(first(params.from), false);
  if (from) filters.requestedFrom = from;
  else reject('from');
  const to = parseDate(first(params.to), true);
  if (to) filters.requestedTo = to;
  else reject('to');

  const rawPage = first(params.page);
  const page = rawPage && /^\d+$/.test(rawPage) ? Math.max(1, Number.parseInt(rawPage, 10)) : 1;
  if (rawPage && !/^\d+$/.test(rawPage)) reject('page');

  return { filters, page, ignored };
}

export function payoutPageHref(params: PayoutSearchParams, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'page') continue;
    const single = first(value);
    if (single) search.set(key, single);
  }
  if (page > 1) search.set('page', String(page));
  const query = search.toString();
  return query ? `/control/payouts?${query}` : '/control/payouts';
}

export const PAYOUT_FILTER_LABELS: Record<string, string> = {
  status: 'Statut',
  provider: 'Provider',
  cycle: 'Cycle',
  nominal: 'Nominal',
  kyc: 'KYC',
  method: 'Méthode de payout',
  from: 'Du',
  to: 'Au',
  page: 'Page',
};
