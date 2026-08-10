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
  StatTile,
  Text,
} from '@wariba/ui';
import {
  governancePageHref,
  loadControlTradingSummary,
  parseOrderQuery,
  searchControlOrders,
  ORDER_FILTER_LABELS,
  TRADABLE_SYMBOLS,
  TRADE_ORDER_STATUSES,
  TRADE_ORDER_TYPES,
  type GovernanceSearchParams,
} from '@wariba/application';
import Link from 'next/link';
import { requireControlArea } from '../../../../lib/staff-auth';
import { getDb } from '../../../../lib/db';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'UTC',
});

const FIELD_CLASS =
  'rounded-[var(--wariba-radius-sm)] border border-[color:var(--wariba-border-subtle)] ' +
  'bg-[color:var(--wariba-background-surface)] px-2 py-1.5 ' +
  'text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-primary)]';
const LABEL_CLASS =
  'flex flex-col gap-1 text-[length:var(--wariba-font-size-label-sm)] ' +
  'text-[color:var(--wariba-text-secondary)]';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  filled: 'success',
  accepted: 'success',
  validated: 'neutral',
  received: 'neutral',
  rejected: 'danger',
  cancelled: 'warning',
};

function raw(value: string | string[] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value;
  return single ?? '';
}

/**
 * The platform-wide order explorer.
 *
 * The account detail page answers "what did this account do". This answers
 * the other operational question — "what is happening across the platform" —
 * which is how an operator finds a rejection pattern or a misbehaving symbol
 * without already knowing which account to open.
 *
 * Read-only. Orders are execution evidence: nothing here cancels, replays,
 * edits or deletes one. The trader command path and the fencing-protected
 * market trigger remain the only writers, and no Server Action exists on
 * this surface to argue with that.
 */
export default async function ControlTradingPage({
  searchParams,
}: {
  searchParams: Promise<GovernanceSearchParams>;
}) {
  await requireControlArea('trading');

  const params = await searchParams;
  const query = parseOrderQuery(params);
  const [result, summary] = await Promise.all([
    searchControlOrders(getDb(), { filters: query.filters, page: query.page }),
    loadControlTradingSummary(getDb()),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text as="h1" variant="heading-lg">
            Trading
          </Text>
          <Text variant="body-sm" color="secondary">
            Ordres et exécution à l’échelle de la plateforme, en lecture seule.
          </Text>
        </div>
        <Badge variant="neutral">{result.total} ordre(s)</Badge>
      </div>

      <Alert level="information" title="Lecture seule">
        Les ordres sont une preuve d’exécution. Control les inspecte et n’en annule, rejoue, modifie
        ni supprime aucun : la commande trader et le déclencheur de marché protégé par fencing
        restent les seuls écrivains.
      </Alert>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Positions ouvertes" value={String(summary.openPositionCount)} />
        <StatTile
          label="Ordres en attente actifs"
          value={String(summary.activePendingOrderCount)}
        />
        <StatTile label="Rejets (24 h)" value={String(summary.rejectedOrdersLast24h)} />
        <StatTile label="Réductions en file" value={String(summary.queuedReductionCount)} />
      </div>

      {query.ignored.length > 0 ? (
        <Alert level="warning" title="Filtres ignorés">
          {query.ignored
            .map((key) => `${ORDER_FILTER_LABELS[key] ?? key} : « ${raw(params[key])} »`)
            .join(' · ')}{' '}
          — valeur invalide, non appliquée.
        </Alert>
      ) : null}

      <Card padding="comfortable">
        <form method="get" action="/control/trading" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={LABEL_CLASS}>
              Compte
              <input
                type="search"
                name="account"
                placeholder="PERF-10000-XXXXXXXX"
                defaultValue={query.filters.accountPublicId ?? ''}
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
                {TRADE_ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Type
              <select
                name="type"
                defaultValue={query.filters.orderType ?? ''}
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                {TRADE_ORDER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Symbole
              <select
                name="symbol"
                defaultValue={query.filters.symbol ?? ''}
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                {TRADABLE_SYMBOLS.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Rejetés
              <select
                name="rejected"
                defaultValue={
                  query.filters.rejectedOnly === undefined ? '' : String(query.filters.rejectedOnly)
                }
                className={FIELD_CLASS}
              >
                <option value="">Tous</option>
                <option value="true">Avec code de rejet</option>
              </select>
            </label>
            <label className={LABEL_CLASS}>
              Du
              <input
                type="date"
                name="from"
                defaultValue={query.filters.receivedFrom?.toISOString().slice(0, 10) ?? ''}
                className={FIELD_CLASS}
              />
            </label>
            <label className={LABEL_CLASS}>
              Au
              <input
                type="date"
                name="to"
                defaultValue={query.filters.receivedTo?.toISOString().slice(0, 10) ?? ''}
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
              href="/control/trading"
              className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
            >
              Réinitialiser
            </a>
          </div>
        </form>
      </Card>

      {result.orders.length === 0 ? (
        <EmptyState title="Aucun ordre" description="Aucun ordre ne correspond à ces filtres." />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>Reçu</DataTableHeaderCell>
              <DataTableHeaderCell>Compte</DataTableHeaderCell>
              <DataTableHeaderCell>Type</DataTableHeaderCell>
              <DataTableHeaderCell>Symbole</DataTableHeaderCell>
              <DataTableHeaderCell>Sens</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Demandé</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Exécuté</DataTableHeaderCell>
              <DataTableHeaderCell>Statut</DataTableHeaderCell>
              <DataTableHeaderCell>Code de rejet</DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {result.orders.map((order) => (
              <DataTableRow key={order.id}>
                <DataTableCell>
                  <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                    {DATE_TIME.format(order.receivedAt)}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  {/* Destination re-checks account.view for itself. */}
                  <Link
                    href={`/control/accounts/${order.accountId}`}
                    className="text-[color:var(--wariba-text-link)]"
                  >
                    {order.accountPublicId}
                  </Link>
                </DataTableCell>
                <DataTableCell>{order.orderType}</DataTableCell>
                {/* Nullable by design: a close/modify order referencing a
                    missing position has no symbol to record. */}
                <DataTableCell>{order.symbol ?? '—'}</DataTableCell>
                <DataTableCell>{order.side ?? '—'}</DataTableCell>
                <DataTableCell numeric>{order.requestedQuantity ?? '—'}</DataTableCell>
                <DataTableCell numeric>{order.filledQuantity}</DataTableCell>
                <DataTableCell>
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>{order.status}</Badge>
                </DataTableCell>
                <DataTableCell>{order.rejectionCode ?? '—'}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Pagination des ordres" className="flex flex-wrap items-center gap-3">
          <span className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
            Page {result.page} sur {totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <a
                href={governancePageHref('/control/trading', params, result.page - 1)}
                rel="prev"
                className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
              >
                Précédent
              </a>
            ) : null}
            {result.page < totalPages ? (
              <a
                href={governancePageHref('/control/trading', params, result.page + 1)}
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
