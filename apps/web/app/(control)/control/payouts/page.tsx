import {
  Alert,
  Badge,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  Text,
} from '@wariba/ui';
import {
  buildControlPayoutReviewView,
  parsePayoutQuery,
  payoutPageHref,
  staffRoleSatisfies,
  PAYOUT_FILTER_LABELS,
  PAYOUT_PROVIDER_STATUSES,
  PAYOUT_STATUSES,
  type PayoutSearchParams,
} from '@wariba/application';
import Link from 'next/link';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';
import { ControlPayoutRowActions } from './ControlPayoutRowActions';

// requireStaffRole() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const FIELD_CLASS =
  'rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] ' +
  'bg-[color:var(--wariba-background-surface)] px-2 py-1.5 ' +
  'text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]';
const LABEL_CLASS =
  'flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] ' +
  'text-[color:var(--wariba-text-secondary)]';

function raw(value: string | string[] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value;
  return single ?? '';
}

export default async function ControlPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<PayoutSearchParams>;
}) {
  // Any staff role can see the queue (finance/compliance both need to,
  // support/risk/admin have legitimate reasons to check status too) — each
  // row's actual buttons are gated per-action below and, authoritatively,
  // by each Server Action's own requireStaffRole call.
  const session = await requireControlArea('payouts');
  const staffCanReviewFinance = staffRoleSatisfies(session.role, 'finance');
  const staffCanManageCompliance = staffRoleSatisfies(session.role, 'compliance');

  const params = await searchParams;
  const query = parsePayoutQuery(params);
  // Filtered, counted and paged by PostgreSQL — the browser never receives
  // the whole queue.
  const result = await buildControlPayoutReviewView(getDb(), {
    filters: query.filters,
    page: query.page,
  });
  const queue = result.items;
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="heading-lg">
          Payout queue
        </Text>
        <Badge variant="neutral">{result.total} demande(s)</Badge>
      </div>

      {query.ignored.length > 0 ? (
        <Alert level="warning" title="Filtres ignorés">
          {query.ignored
            .map((key) => `${PAYOUT_FILTER_LABELS[key] ?? key} : « ${raw(params[key])} »`)
            .join(' · ')}{' '}
          — valeur invalide, non appliquée. Les résultats ci-dessous ne sont pas filtrés par cette
          valeur.
        </Alert>
      ) : null}

      <Card padding="comfortable">
        {/* Rendered from the parsed query, never the raw URL. */}
        <form method="get" action="/control/payouts" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={LABEL_CLASS}>
              Recherche (compte, trader)
              <input
                type="search"
                name="q"
                defaultValue={query.filters.query ?? ''}
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              Statut
              <select
                name="status"
                defaultValue={query.filters.status ?? ''}
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                {PAYOUT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Provider
              <select
                name="provider"
                defaultValue={query.filters.providerStatus ?? ''}
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                {PAYOUT_PROVIDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Cycle
              <select
                name="cycle"
                defaultValue={query.filters.cycleNumber ? String(query.filters.cycleNumber) : ''}
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                {[1, 2, 3, 4, 5].map((cycle) => (
                  <option key={cycle} value={cycle}>
                    P{cycle}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Nominal
              <input
                type="text"
                name="nominal"
                inputMode="decimal"
                defaultValue={query.filters.nominalBalance ?? ''}
                placeholder="10000.00"
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              KYC
              <select
                name="kyc"
                defaultValue={
                  query.filters.kycVerified === undefined ? '' : String(query.filters.kycVerified)
                }
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                <option value="true">Vérifié</option>
                <option value="false">Non vérifié</option>
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Du
              <input
                type="date"
                name="from"
                defaultValue={query.filters.requestedFrom?.toISOString().slice(0, 10) ?? ''}
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              Au
              <input
                type="date"
                name="to"
                defaultValue={query.filters.requestedTo?.toISOString().slice(0, 10) ?? ''}
                className={FIELD_CLASS}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-selected)] px-3 py-1.5 text-[length:var(--wariba-font-size-label-sm)] font-semibold text-[color:var(--wariba-text-primary)]"
            >
              Filtrer
            </button>
            <a
              href="/control/payouts"
              className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
            >
              Réinitialiser
            </a>
          </div>
        </form>
      </Card>

      {queue.length === 0 ? (
        <EmptyState
          title="Aucune demande de payout"
          description="Aucune demande ne correspond à ces filtres."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Trader</DataTableHeaderCell>
              <DataTableHeaderCell>Compte</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Cycle</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Statut</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Demandé (net)</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Plafond / Split</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Approuvé</DataTableHeaderCell>
              <DataTableHeaderCell align="right">KYC / Paiement</DataTableHeaderCell>
              <DataTableHeaderCell>Demandé le</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Actions</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {queue.map((item) => (
              <DataTableRow key={item.id}>
                <DataTableCell>{item.traderName}</DataTableCell>
                <DataTableCell>
                  {/* Evidence lives on its own page; the link crosses no
                      authorization boundary — the destination re-checks. */}
                  <Link
                    href={`/control/payouts/${item.id}`}
                    className="text-[color:var(--wariba-text-link)]"
                  >
                    {item.accountPublicId}
                  </Link>
                  <br />
                  <span className="text-[color:var(--wariba-text-secondary)]">
                    {item.nominalBalanceFormatted}
                  </span>
                </DataTableCell>
                <DataTableCell numeric>n°{item.cycleNumber}</DataTableCell>
                <DataTableCell align="right">
                  <Badge variant={item.statusVariant}>{item.statusLabel}</Badge>
                </DataTableCell>
                <DataTableCell numeric>{item.requestedNetCashFormatted}</DataTableCell>
                <DataTableCell numeric>
                  {item.capAppliedFormatted} · {item.traderSplitPercent} %
                </DataTableCell>
                <DataTableCell numeric>
                  {item.approvedGrossBaseFormatted ?? '—'}
                  {item.traderNetCashFormatted ? (
                    <>
                      <br />
                      <span className="text-[color:var(--wariba-text-secondary)]">
                        net {item.traderNetCashFormatted}
                      </span>
                    </>
                  ) : null}
                </DataTableCell>
                <DataTableCell align="right">
                  <Badge variant={item.kycVerified ? 'success' : 'warning'}>
                    {item.kycVerified ? 'KYC OK' : 'KYC manquant'}
                  </Badge>
                  <br />
                  <Badge variant={item.payoutMethodConfigured ? 'success' : 'warning'}>
                    {item.payoutMethodConfigured ? 'Paiement OK' : 'Paiement manquant'}
                  </Badge>
                </DataTableCell>
                <DataTableCell>{item.requestedAtLabel}</DataTableCell>
                <DataTableCell align="right">
                  <ControlPayoutRowActions
                    payoutRequestId={item.id}
                    accountId={item.accountId}
                    canApproveOrReject={item.canApproveOrReject}
                    canSubmit={item.canSubmit}
                    canSettle={item.canSettle}
                    canReverse={item.canReverse}
                    kycVerified={item.kycVerified}
                    payoutMethodConfigured={item.payoutMethodConfigured}
                    staffCanReviewFinance={staffCanReviewFinance}
                    staffCanManageCompliance={staffCanManageCompliance}
                    reversalReason={item.reversalReason}
                  />
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Pagination des demandes" className="flex flex-wrap items-center gap-3">
          <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Page {result.page} sur {totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <a
                href={payoutPageHref(params, result.page - 1)}
                rel="prev"
                className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
              >
                Précédent
              </a>
            ) : null}
            {result.page < totalPages ? (
              <a
                href={payoutPageHref(params, result.page + 1)}
                rel="next"
                className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
              >
                Suivant
              </a>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
