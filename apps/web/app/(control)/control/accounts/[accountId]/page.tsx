import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import { authorizedAccountSections, loadControlAccountDetail } from '@wariba/application';
import { ControlDocumentLink as Link } from '../../../ControlDocumentLink';
import { notFound } from 'next/navigation';
import { requireControlArea } from '../../../../../lib/staff-auth';
import { getDb } from '../../../../../lib/db';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});
const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeZone: 'UTC' });
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  soft_locked: 'warning',
  breached: 'danger',
  passed: 'success',
  pass_pending: 'warning',
  matched: 'success',
  mismatched: 'danger',
  open: 'warning',
  resolved: 'success',
  critical: 'danger',
  warning: 'warning',
};

const PROGRAM_LABEL: Record<string, string> = {
  WARIBA_ONE: 'WARIBA ONE',
  WARIBA_PERFORMANCE: 'WARIBA Performance',
};

const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  pending_activation: 'Activation en attente',
  active: 'Actif',
  soft_locked: 'Blocage temporaire',
  pass_pending: 'Objectif atteint',
  passed: 'Évaluation réussie',
  breached: 'Compte terminé',
  inactive: 'Inactif',
  closed: 'Fermé',
};

const POLICY_STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publiée',
  retired: 'Retirée',
};

const CYCLE_STATUS_LABEL: Record<string, string> = {
  active: 'actif',
  frozen: 'gelé',
  paid: 'payé',
  closed: 'fermé',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        {label}
      </dt>
      <dd className="wariba-data">{value}</dd>
    </div>
  );
}

/**
 * An account's operational record.
 *
 * Every section below is rendered only if the server returned it, and the
 * server only returns what this operator's role is authorized to read — the
 * queries for unauthorized domains are never issued. There is no
 * client-side hiding here and nothing to reveal by editing the URL: the
 * section set is derived from the role alone.
 *
 * Read-only throughout. Prompt 09 adds no balance edit, no ledger edit, no
 * fill deletion and no reconciliation correction.
 */
export default async function ControlAccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const session = await requireControlArea('accounts');
  const { accountId } = await params;
  // A malformed id would be a Postgres error against a uuid column.
  if (!UUID_PATTERN.test(accountId)) notFound();

  const sections = authorizedAccountSections(session.role);
  const detail = await loadControlAccountDetail(getDb(), { accountId, sections });
  if (!detail) notFound();

  const {
    overview,
    trading,
    risk,
    payout,
    reconciliationEvidence,
    incidentEvidence,
    auditEvidence,
  } = detail;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/control/accounts"
          className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
        >
          ← Comptes
        </Link>
        <Text as="h1" variant="heading-lg">
          {overview ? overview.publicId : 'Compte'}
        </Text>
      </div>

      {overview ? (
        <Card>
          <Text as="h2" variant="heading-sm">
            Vue d’ensemble
          </Text>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Identifiant public" value={overview.publicId} />
            <Field
              label="Programme"
              value={PROGRAM_LABEL[overview.programType] ?? overview.programType}
            />
            <Field label="Nominal" value={`${overview.nominalBalance} ${overview.currency}`} />
            <div>
              <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                Statut
              </dt>
              <dd>
                <Badge variant={STATUS_VARIANT[overview.status] ?? 'neutral'}>
                  {ACCOUNT_STATUS_LABEL[overview.status] ?? overview.status}
                </Badge>
              </dd>
            </div>
            <Field
              label="Version de politique"
              value={`${overview.policyVersion} · ${POLICY_STATUS_LABEL[overview.policyStatus] ?? overview.policyStatus}`}
            />
            <Field
              label="Identité (sandbox)"
              value={overview.kycSandboxVerified ? 'Vérifié' : 'Non vérifié'}
            />
            <Field
              label="Méthode de payout (sandbox)"
              value={overview.payoutMethodSandboxConfigured ? 'Configurée' : 'Absente'}
            />
            <Field
              label="Activé le"
              value={overview.activatedAt ? DATE.format(overview.activatedAt) : '—'}
            />
            {overview.sourceEvaluation ? (
              <div>
                <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                  Évaluation d’origine
                </dt>
                <dd>
                  <Link
                    className="wariba-data text-[color:var(--wariba-text-link)]"
                    href={`/control/accounts/${overview.sourceEvaluation.id}`}
                  >
                    {overview.sourceEvaluation.publicId}
                  </Link>
                </dd>
              </div>
            ) : null}
            {overview.performanceChild ? (
              <div>
                <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                  Compte Performance créé
                </dt>
                <dd>
                  <Link
                    className="wariba-data text-[color:var(--wariba-text-link)]"
                    href={`/control/accounts/${overview.performanceChild.id}`}
                  >
                    {overview.performanceChild.publicId}
                  </Link>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                Titulaire
              </dt>
              <dd>
                <Link
                  href={`/control/users/${overview.userId}`}
                  className="text-[color:var(--wariba-text-link)]"
                >
                  {overview.userEmail ?? overview.userId}
                </Link>
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {trading ? (
        <Card>
          <Text as="h2" variant="heading-sm">
            Trading
          </Text>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="PnL réalisé" value={trading.realizedPnl} />
            <Field
              label="Profit court-terme inéligible"
              value={trading.ineligibleShortDurationProfit}
            />
            <Field label="Positions ouvertes" value={String(trading.openPositions.length)} />
          </dl>

          <Text as="h3" variant="heading-sm" className="mt-4">
            Ordres récents
          </Text>
          {trading.recentOrders.length === 0 ? (
            <div className="mt-2">
              <EmptyState title="Aucun ordre" description="Aucun ordre sur ce compte." />
            </div>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-[length:var(--wariba-font-size-body-sm)]">
                <caption className="sr-only">Ordres récents</caption>
                <thead className="text-[color:var(--wariba-text-secondary)]">
                  <tr>
                    <th scope="col" className="p-2 font-semibold">
                      Horodatage
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Symbole
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Type
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Statut
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Motif de rejet
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Idempotence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trading.recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-[color:var(--wariba-border-subtle)]"
                    >
                      <td className="whitespace-nowrap p-2">
                        <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                          {DATE_TIME.format(order.createdAt)}
                        </span>
                      </td>
                      <td className="p-2">{order.symbol ?? '—'}</td>
                      <td className="p-2">{order.orderType}</td>
                      <td className="p-2">{order.status}</td>
                      <td className="p-2">{order.rejectionCode ?? '—'}</td>
                      <td className="p-2">
                        <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                          {order.idempotencyKey}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {risk ? (
        <Card>
          <Text as="h2" variant="heading-sm">
            Risque &amp; intégrité
          </Text>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Integrity hold" value={risk.integrityHold ? 'Actif' : 'Aucun'} />
            <Field label="Motif" value={risk.integrityHoldReason ?? '—'} />
            <Field
              label="Depuis"
              value={risk.integrityHoldSetAt ? DATE_TIME.format(risk.integrityHoldSetAt) : '—'}
            />
            {risk.latestSnapshot ? (
              <>
                <Field label="Jour de référence" value={risk.latestSnapshot.tradingDay} />
                <Field label="Référence quotidienne" value={risk.latestSnapshot.dailyReference} />
                <Field
                  label="Plancher Maximum Loss"
                  value={
                    risk.latestSnapshot.maximumLossFloorAfter ??
                    risk.latestSnapshot.maximumLossFloorBefore
                  }
                />
              </>
            ) : null}
          </dl>

          <Text as="h3" variant="heading-sm" className="mt-4">
            Violations
          </Text>
          {risk.violations.length === 0 ? (
            <div className="mt-2">
              <EmptyState title="Aucune violation" description="Aucune violation enregistrée." />
            </div>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {risk.violations.map((violation, index) => (
                <li
                  key={`${violation.ruleCode}-${index}`}
                  className="flex flex-wrap items-baseline gap-2 border-t border-[color:var(--wariba-border-subtle)] pt-2 text-[length:var(--wariba-font-size-body-sm)] first:border-0 first:pt-0"
                >
                  <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                    {DATE_TIME.format(violation.occurredAt)}
                  </span>
                  <Badge variant={STATUS_VARIANT[violation.severity] ?? 'neutral'}>
                    {violation.severity}
                  </Badge>
                  <span>{violation.ruleCode}</span>
                  <span className="text-[color:var(--wariba-text-secondary)]">
                    seuil {violation.thresholdValue ?? '—'} · observé{' '}
                    {violation.observedValue ?? '—'} · {violation.consequence}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {payout ? (
        <Card>
          <Text as="h2" variant="heading-sm">
            Payout
          </Text>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Cycle courant"
              value={
                payout.currentCycle
                  ? `n°${payout.currentCycle.cycleNumber} (${CYCLE_STATUS_LABEL[payout.currentCycle.status] ?? payout.currentCycle.status})`
                  : '—'
              }
            />
            <Field label="Demandes" value={String(payout.requests.length)} />
          </dl>
          {payout.requests.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="Aucune demande" description="Aucune demande de payout." />
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-[length:var(--wariba-font-size-body-sm)]">
                <caption className="sr-only">Demandes de payout</caption>
                <thead className="text-[color:var(--wariba-text-secondary)]">
                  <tr>
                    <th scope="col" className="p-2 font-semibold">
                      Cycle
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Statut
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Demandé (net)
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Base brute approuvée
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Net trader
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Part WARIBA
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Provider
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payout.requests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-t border-[color:var(--wariba-border-subtle)]"
                    >
                      <td className="p-2">n°{request.cycleNumber}</td>
                      <td className="p-2">{request.status}</td>
                      <td className="p-2">
                        <span className="wariba-data">{request.requestedNetTraderCash}</span>
                      </td>
                      <td className="p-2">
                        <span className="wariba-data">{request.approvedGrossBase ?? '—'}</span>
                      </td>
                      <td className="p-2">
                        <span className="wariba-data">{request.traderNetCash ?? '—'}</span>
                      </td>
                      <td className="p-2">
                        <span className="wariba-data">{request.waribaShare ?? '—'}</span>
                      </td>
                      <td className="p-2">
                        {request.provider ?? '—'}
                        {request.providerStatus ? ` · ${request.providerStatus}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {reconciliationEvidence ? (
        <Card>
          <Text as="h2" variant="heading-sm">
            Réconciliation financière
          </Text>
          {reconciliationEvidence.runs.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="Aucune exécution"
                description="Aucune réconciliation enregistrée pour ce compte."
              />
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-[length:var(--wariba-font-size-body-sm)]">
                <caption className="sr-only">Exécutions de réconciliation</caption>
                <thead className="text-[color:var(--wariba-text-secondary)]">
                  <tr>
                    <th scope="col" className="p-2 font-semibold">
                      Horodatage
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Résultat
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Solde stocké
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Solde reconstruit
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Éligible stocké
                    </th>
                    <th scope="col" className="p-2 font-semibold">
                      Éligible reconstruit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliationEvidence.runs.map((run) => (
                    <tr
                      key={run.id}
                      className="border-t border-[color:var(--wariba-border-subtle)]"
                    >
                      <td className="whitespace-nowrap p-2">
                        <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                          {DATE_TIME.format(run.executedAt)}
                        </span>
                      </td>
                      <td className="p-2">
                        <Badge variant={STATUS_VARIANT[run.status] ?? 'neutral'}>
                          {run.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <span className="wariba-data">{run.storedAccountBalance}</span>
                      </td>
                      <td className="p-2">
                        <span className="wariba-data">{run.reconstructedAccountBalance}</span>
                      </td>
                      <td className="p-2">
                        <span className="wariba-data">{run.storedProgramEligibleBalance}</span>
                      </td>
                      <td className="p-2">
                        <span className="wariba-data">
                          {run.reconstructedProgramEligibleBalance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {incidentEvidence ? (
        <Card>
          <Text as="h2" variant="heading-sm">
            Incidents
          </Text>
          {incidentEvidence.incidents.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="Aucun incident" description="Aucun incident sur ce compte." />
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {incidentEvidence.incidents.map((incident) => (
                <li
                  key={incident.id}
                  className="flex flex-wrap items-baseline gap-2 border-t border-[color:var(--wariba-border-subtle)] pt-2 text-[length:var(--wariba-font-size-body-sm)] first:border-0 first:pt-0"
                >
                  <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                    {DATE_TIME.format(incident.openedAt)}
                  </span>
                  <Badge variant={STATUS_VARIANT[incident.severity] ?? 'neutral'}>
                    {incident.severity}
                  </Badge>
                  <span>{incident.incidentCode}</span>
                  <span className="text-[color:var(--wariba-text-secondary)]">
                    {incident.status}
                    {incident.resolutionReason ? ` · ${incident.resolutionReason}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {auditEvidence ? (
        <Card>
          <Text as="h2" variant="heading-sm">
            Audit
          </Text>
          {auditEvidence.events.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="Aucun événement"
                description="Aucun événement d’audit pour ce compte."
              />
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {auditEvidence.events.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-baseline gap-2 border-t border-[color:var(--wariba-border-subtle)] pt-2 text-[length:var(--wariba-font-size-body-sm)] first:border-0 first:pt-0"
                >
                  <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                    {DATE_TIME.format(event.occurredAt)}
                  </span>
                  <span>{event.action}</span>
                  <span className="text-[color:var(--wariba-text-secondary)]">
                    {event.role ?? '—'} · {event.reason ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
