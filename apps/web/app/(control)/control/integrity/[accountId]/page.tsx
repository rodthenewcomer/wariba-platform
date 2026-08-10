import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import { canReadAccountSection, loadRiskInvestigation } from '@wariba/application';
import type { RiskInvestigationSection } from '@wariba/application';
import Link from 'next/link';
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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The risk operator's investigation view of one account.
 *
 * This exists because risk deliberately cannot enter the generic Accounts
 * explorer — it holds no `account.view`, and widening that would hand every
 * risk operator the whole user-facing account surface. So the case reaches
 * risk here instead, carrying only what an investigation needs.
 *
 * The identity shown is the minimum necessary to know which account is in
 * question: public id, program, status. No email, no name, no country. A
 * reconciliation either balances or it does not, and knowing who the trader
 * is does not help decide that.
 *
 * Each evidence block is gated on its own authority and queried only when
 * the operator holds it — risk.view, reconciliation.view, incident.view.
 * Payout and audit evidence are absent by design: they belong to
 * payout.view and audit_evidence.view, which this surface does not grant.
 */
export default async function ControlRiskInvestigationPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const session = await requireControlArea('risk');
  const { accountId } = await params;
  if (!UUID_PATTERN.test(accountId)) notFound();

  // Section authorities are resolved from the role, exactly as on the
  // account detail — nothing in the URL participates.
  const sections = new Set<RiskInvestigationSection>();
  if (canReadAccountSection(session.role, 'risk')) sections.add('risk');
  if (canReadAccountSection(session.role, 'reconciliation_evidence')) {
    sections.add('reconciliation_evidence');
  }
  if (canReadAccountSection(session.role, 'incident_evidence')) sections.add('incident_evidence');

  const detail = await loadRiskInvestigation(getDb(), { accountId, sections });
  if (!detail) notFound();

  const { identity, risk, reconciliationEvidence, incidentEvidence } = detail;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/control/integrity"
          className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
        >
          ← Risk &amp; Integrity
        </Link>
        <Text as="h1" variant="heading-lg">
          {identity.accountPublicId}
        </Text>
        <Text variant="body-sm" color="secondary">
          {identity.programType} · {identity.status}
        </Text>
      </div>

      {risk ? (
        <Card padding="comfortable" className="flex flex-col gap-4">
          <div>
            <Text as="h2" variant="heading-sm">
              Intégrité
            </Text>
            <Text variant="body-sm" color="secondary">
              Un integrity hold ne peut être levé tant que la réconciliation échoue — la levée passe
              par la protection d’intégrité, jamais par une clôture manuelle d’incident.
            </Text>
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                Integrity hold
              </dt>
              <dd>
                {risk.integrityHold ? (
                  <Badge variant="danger">actif</Badge>
                ) : (
                  <Badge variant="success">aucun</Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                Motif
              </dt>
              <dd>{risk.integrityHoldReason ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                Depuis
              </dt>
              <dd className="wariba-data">
                {risk.integrityHoldSetAt ? DATE_TIME.format(risk.integrityHoldSetAt) : '—'}
              </dd>
            </div>
          </dl>

          <div>
            <Text as="h3" variant="heading-sm">
              Violations
            </Text>
            {risk.violations.length === 0 ? (
              <Text variant="body-sm" color="secondary">
                Aucune violation enregistrée.
              </Text>
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
                    <Badge variant={violation.severity === 'critical' ? 'danger' : 'warning'}>
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
          </div>

          <div>
            <Text as="h3" variant="heading-sm">
              Snapshots de risque
            </Text>
            {risk.snapshots.length === 0 ? (
              <Text variant="body-sm" color="secondary">
                Aucun snapshot finalisé.
              </Text>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-[length:var(--wariba-font-size-body-sm)]">
                  <caption className="sr-only">Snapshots quotidiens</caption>
                  <thead className="text-[color:var(--wariba-text-secondary)]">
                    <tr>
                      <th scope="col" className="p-2 font-semibold">
                        Jour
                      </th>
                      <th scope="col" className="p-2 font-semibold">
                        Référence quotidienne
                      </th>
                      <th scope="col" className="p-2 font-semibold">
                        Plancher avant
                      </th>
                      <th scope="col" className="p-2 font-semibold">
                        Plancher après
                      </th>
                      <th scope="col" className="p-2 font-semibold">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {risk.snapshots.map((snapshot) => (
                      <tr
                        key={snapshot.tradingDay}
                        className="border-t border-[color:var(--wariba-border-subtle)]"
                      >
                        <td className="p-2">
                          <span className="wariba-data">{snapshot.tradingDay}</span>
                        </td>
                        <td className="p-2">
                          <span className="wariba-data">{snapshot.dailyReference}</span>
                        </td>
                        <td className="p-2">
                          <span className="wariba-data">{snapshot.maximumLossFloorBefore}</span>
                        </td>
                        <td className="p-2">
                          <span className="wariba-data">
                            {snapshot.maximumLossFloorAfter ?? '—'}
                          </span>
                        </td>
                        <td className="p-2">{snapshot.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {reconciliationEvidence ? (
        <Card padding="comfortable" className="flex flex-col gap-4">
          <Text as="h2" variant="heading-sm">
            Réconciliation financière
          </Text>
          {reconciliationEvidence.runs.length === 0 ? (
            <Text variant="body-sm" color="secondary">
              Aucune réconciliation enregistrée pour ce compte.
            </Text>
          ) : (
            <div className="overflow-x-auto">
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
                        <Badge variant={run.status === 'matched' ? 'success' : 'danger'}>
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
        <Card padding="comfortable" className="flex flex-col gap-4">
          <Text as="h2" variant="heading-sm">
            Incidents liés
          </Text>
          {incidentEvidence.incidents.length === 0 ? (
            <Text variant="body-sm" color="secondary">
              Aucun incident lié à ce compte.
            </Text>
          ) : (
            <ul className="flex flex-col gap-2">
              {incidentEvidence.incidents.map((incident) => (
                <li
                  key={incident.id}
                  className="flex flex-wrap items-baseline gap-2 border-t border-[color:var(--wariba-border-subtle)] pt-2 text-[length:var(--wariba-font-size-body-sm)] first:border-0 first:pt-0"
                >
                  <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                    {DATE_TIME.format(incident.openedAt)}
                  </span>
                  <Badge variant={incident.severity === 'critical' ? 'danger' : 'warning'}>
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

      {!risk && !reconciliationEvidence && !incidentEvidence ? (
        <EmptyState
          title="Aucune évidence autorisée"
          description="Votre rôle n’ouvre aucune section d’investigation pour ce compte."
        />
      ) : null}
    </div>
  );
}
