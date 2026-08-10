import { AUDIT_PAGE_SIZE, type AuditEventFilters } from '@wariba/database';

/**
 * Prompt 09 — parses the audit explorer's URL query into a filter set.
 *
 * Filters live in the URL so an operator can bookmark, share and reload an
 * investigation, and so the browser's back button behaves. That also means
 * every value arrives as untrusted text, and two of them (`actor`, `target`)
 * are compared against `uuid` columns where a malformed value is a Postgres
 * error, not an empty result. Everything is therefore validated here and
 * anything unusable is dropped rather than forwarded: a bad parameter
 * narrows nothing and shows the unfiltered page, never a crash and never a
 * silently wrong result set.
 *
 * Dropping beats clamping for the identifier and date filters — quietly
 * "correcting" `target=abc` into some other query would show an operator
 * evidence they did not ask for, which in an audit tool is worse than
 * showing them everything.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Page sizes an operator may choose. Anything else falls back to the default. */
export const AUDIT_PAGE_SIZES = [25, 50, 100, 200] as const;

export interface AuditQuery {
  filters: AuditEventFilters;
  page: number;
  pageSize: number;
}

export type AuditSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function uuid(value: string | string[] | undefined): string | undefined {
  const candidate = first(value);
  return candidate && UUID_PATTERN.test(candidate) ? candidate : undefined;
}

function date(value: string | string[] | undefined, endOfDay: boolean): Date | undefined {
  const candidate = first(value);
  if (!candidate) return undefined;
  // A bare `YYYY-MM-DD` is read as UTC, and the "to" bound covers the whole
  // day — an operator asking for "up to the 9th" means the end of the 9th,
  // not its first instant, which would return nothing.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(candidate)
    ? `${candidate}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
    : candidate;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function positiveInteger(value: string | string[] | undefined): number | undefined {
  const candidate = first(value);
  if (!candidate || !/^\d+$/.test(candidate)) return undefined;
  const parsed = Number.parseInt(candidate, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseAuditQuery(params: AuditSearchParams): AuditQuery {
  const requestedPageSize = positiveInteger(params.pageSize);
  const pageSize = AUDIT_PAGE_SIZES.includes(requestedPageSize as (typeof AUDIT_PAGE_SIZES)[number])
    ? (requestedPageSize as number)
    : AUDIT_PAGE_SIZE;

  const filters: AuditEventFilters = {};
  const actorId = uuid(params.actor);
  if (actorId) filters.actorId = actorId;
  const role = first(params.role);
  if (role) filters.role = role;
  const activity = first(params.activity);
  if (activity) filters.activity = activity;
  const targetType = first(params.targetType);
  if (targetType) filters.targetType = targetType;
  const targetId = uuid(params.target);
  if (targetId) filters.targetId = targetId;
  const correlationId = first(params.correlation);
  if (correlationId) filters.correlationId = correlationId;
  const occurredFrom = date(params.from, false);
  if (occurredFrom) filters.occurredFrom = occurredFrom;
  const occurredTo = date(params.to, true);
  if (occurredTo) filters.occurredTo = occurredTo;

  return { filters, page: positiveInteger(params.page) ?? 1, pageSize };
}

/**
 * Rebuilds the query string with `page` replaced, so paging never silently
 * discards the filters an operator is working under.
 */
export function auditPageHref(params: AuditSearchParams, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'page') continue;
    const single = first(value);
    if (single) search.set(key, single);
  }
  if (page > 1) search.set('page', String(page));
  const query = search.toString();
  return query ? `/control/audit?${query}` : '/control/audit';
}

/** Total pages for a result set, never below one so the UI always has a page 1. */
export function auditTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
