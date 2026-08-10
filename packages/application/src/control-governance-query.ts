import {
  POLICY_PROGRAMS,
  POLICY_STATUSES,
  type ControlPolicyFilters,
  type ControlStaffFilters,
  type StaffRole,
} from '@wariba/database';

/**
 * Prompt 09 milestone 5 — URL parsing for the governance explorers.
 *
 * Same contract as the other explorers: filters live in the URL so a view
 * can be shared and reloaded, every value therefore arrives as untrusted
 * text, and anything unusable is dropped *and reported* rather than
 * forwarded. An operator who filters, gets an unfiltered list, and is told
 * nothing has been shown the wrong answer to their question.
 */
export type GovernanceSearchParams = Record<string, string | string[] | undefined>;

export const STAFF_ROLES: readonly StaffRole[] = [
  'support',
  'risk',
  'finance',
  'compliance',
  'admin',
  'super_admin',
];

/** Semantic versions in this table look like `1.1.0`. */
const SEMANTIC_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export interface PolicyQuery {
  filters: ControlPolicyFilters;
  page: number;
  ignored: readonly string[];
}

export function parsePolicyQuery(params: GovernanceSearchParams): PolicyQuery {
  const ignored: string[] = [];
  const reject = (key: string): void => {
    if (first(params[key]) !== undefined) ignored.push(key);
  };
  const filters: ControlPolicyFilters = {};

  const program = first(params.program);
  if (program && (POLICY_PROGRAMS as readonly string[]).includes(program)) {
    filters.program = program as (typeof POLICY_PROGRAMS)[number];
  } else if (program) reject('program');

  const status = first(params.status);
  if (status && (POLICY_STATUSES as readonly string[]).includes(status)) {
    filters.status = status as (typeof POLICY_STATUSES)[number];
  } else if (status) reject('status');

  const version = first(params.version);
  if (version && SEMANTIC_VERSION_PATTERN.test(version)) filters.semanticVersion = version;
  else if (version) reject('version');

  const retired = first(params.retired);
  if (retired === 'true') filters.retired = true;
  else if (retired === 'false') filters.retired = false;
  else if (retired) reject('retired');

  const rawPage = first(params.page);
  const page = rawPage && /^\d+$/.test(rawPage) ? Math.max(1, Number.parseInt(rawPage, 10)) : 1;
  if (rawPage && !/^\d+$/.test(rawPage)) reject('page');

  return { filters, page, ignored };
}

export interface StaffQuery {
  filters: ControlStaffFilters;
  page: number;
  ignored: readonly string[];
}

export function parseStaffQuery(params: GovernanceSearchParams): StaffQuery {
  const ignored: string[] = [];
  const reject = (key: string): void => {
    if (first(params[key]) !== undefined) ignored.push(key);
  };
  const filters: ControlStaffFilters = {};

  const query = first(params.q);
  if (query) filters.query = query;

  const role = first(params.role);
  if (role && (STAFF_ROLES as readonly string[]).includes(role)) {
    filters.role = role as StaffRole;
  } else if (role) reject('role');

  const rawPage = first(params.page);
  const page = rawPage && /^\d+$/.test(rawPage) ? Math.max(1, Number.parseInt(rawPage, 10)) : 1;
  if (rawPage && !/^\d+$/.test(rawPage)) reject('page');

  return { filters, page, ignored };
}

/** Rebuilds the current query string with a different page. */
export function governancePageHref(
  basePath: string,
  params: GovernanceSearchParams,
  page: number,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'page') continue;
    const single = first(value);
    if (single) search.set(key, single);
  }
  if (page > 1) search.set('page', String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export const POLICY_FILTER_LABELS: Record<string, string> = {
  program: 'Programme',
  status: 'Statut',
  version: 'Version',
  retired: 'Retirée',
  page: 'Page',
};

export const STAFF_FILTER_LABELS: Record<string, string> = {
  role: 'Rôle',
  page: 'Page',
};
