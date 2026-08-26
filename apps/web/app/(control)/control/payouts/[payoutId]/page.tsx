import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import {
  canReadAccountSection,
  loadControlPayoutDetail,
  type PayoutDetailSection,
} from '@wariba/application';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireControlArea } from '../../../../../lib/staff-auth';
import { getDb } from '../../../../../lib/db';

// requireControlArea() needs request-time cookies + DB config; see the
// (control) layout's dynamic export for why this can't be static.
export const dynamic = 'force-dynamic';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'UTC',
});
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function Gate({ label, ok, detail }: { label: string; ok: boolean; detail?: string | null }) {
  return (
    <div>
      <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
        {label}
      </dt>
      <dd>
        <Badge variant={ok ? 'success' : 'danger'}>{ok ? 'OK' : 'Bloquant'}</Badge>
        {detail ? (
          <span className="ml-2 text-[color:var(--wariba-text-secondary)]">{detail}</span>
        ) : null}
      </dd>
    </div>
  );
}

/**
 * A payout's evidence.
 *
 * Every monetary figure here is read back from what the engine persisted —
 * the immutable eligibility snapshot, the approved amounts, the ledger
 * entries. Nothing is recalculated: a second answer computed for display
 * could disagree with the authoritative one, and an operator reviewing a
 * payout would have no way to know which was binding.
 *
 * Read-only. Approving, rejecting, settling and reversing stay on the queue,
 * each behind its own finance authority checked inside the Server Action.
 */
export default async function ControlPayoutDetailPage({
  params,
}: {
  params: Promise<{ payoutId: string }>;
}) {
  const session = await requireControlArea('payouts');
  const { payoutId } = await params;
  if (!UUID_PATTERN.test(payoutId)) notFound();

  // Cross-domain evidence keeps its own authority — a link from a payout is
  // not a bridge into audit or reconciliation.
  const sections = new Set<PayoutDetailSection>(['payout']);
  if (canReadAccountSection(session.role, 'audit_evidence')) sections.add('audit_evidence');
  if (canReadAccountSection(session.role, 'reconciliation_evidence')) {
    sections.add('reconciliation_evidence');
  }

  const detail = await loadControlPayoutDetail(getDb(), { payoutRequestId: payoutId, sections });
  if (!detail) notFound();

  const { request, approval, gates, provider, reversal, lifecycle, ledgerEntries } = detail;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/control/payouts"
          className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-link)]"
        >
          ← Payout queue
        </Link>
        <Text as="h1" variant="heading-lg">
          {request.accountPublicId} · P{request.cycleNumber}
        </Text>
        <Badge variant={request.status === 'paid' ? 'success' : 'neutral'}>{request.status}</Badge>
      </div>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Demande
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Identifiant" value={request.id} />
          <Field label="Cycle" value={`P${request.cycleNumber}`} />
          <Field
            label="Demandé (net trader)"
            value={`${request.requestedNetTraderCash} ${request.currency}`}
          />
          <Field label="Demandé le" value={DATE_TIME.format(request.requestedAt)} />
        </dl>
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Calcul autoritatif
        </Text>
        <Text variant="body-sm" color="secondary">
          Valeurs persistées par le moteur de payout — jamais recalculées ici.
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Seuil du buffer" value={approval.bufferFloorAtRequest} />
          <Field label="Excédent éligible" value={approval.eligibleExcessAtRequest} />
          <Field label="Plafond appliqué" value={approval.capApplied} />
          <Field label="Split trader" value={approval.traderSplitRate} />
          <Field label="Base brute approuvée" value={approval.approvedGrossBase ?? '—'} />
          <Field label="Net trader" value={approval.traderNetCash ?? '—'} />
          <Field label="Part WARIBA" value={approval.waribaShare ?? '—'} />
          <Field label="Débit du compte" value={approval.approvedGrossBase ?? '—'} />
        </dl>
        {approval.rejectionCode ? (
          <Text variant="body-sm" color="secondary">
            Code de rejet : {approval.rejectionCode}
          </Text>
        ) : null}
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Instantané d’éligibilité
        </Text>
        <Text variant="body-sm" color="secondary">
          Immuable, écrit au moment de la demande.
        </Text>
        <pre className="mt-3 overflow-x-auto rounded-[var(--wariba-radius-sm)] bg-[color:var(--wariba-background-canvas)] p-3 text-[length:var(--wariba-font-size-data-sm)]">
          {JSON.stringify(detail.eligibilitySnapshot, null, 2)}
        </pre>
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Gates
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Gate label="KYC sandbox" ok={gates.kycVerified} />
          <Gate label="Méthode de payout" ok={gates.payoutMethodConfigured} />
          <Gate
            label="Integrity hold"
            ok={!gates.integrityHold}
            detail={gates.integrityHoldReason}
          />
          <Gate
            label="Gel d’exposition"
            ok={!gates.payoutFreezeActive}
            detail={gates.cycleStatus}
          />
        </dl>
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Cycle de vie
        </Text>
        <ul className="mt-3 flex flex-col gap-2">
          {lifecycle.map((event, index) => (
            <li
              key={`${event.stage}-${index}`}
              className="flex flex-wrap items-baseline gap-2 border-t border-[color:var(--wariba-border-subtle)] pt-2 text-[length:var(--wariba-font-size-body-sm)] first:border-0 first:pt-0"
            >
              <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                {DATE_TIME.format(event.at)}
              </span>
              <Badge variant="neutral">{event.stage}</Badge>
              {event.detail ? (
                <span className="text-[color:var(--wariba-text-secondary)]">{event.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Provider
        </Text>
        <Text variant="body-sm" color="secondary">
          Une soumission acceptée n’est pas un règlement : le statut reste « processing » jusqu’à la
          réconciliation provider.
        </Text>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Provider" value={provider.provider ?? '—'} />
          <Field label="Référence" value={provider.providerReference ?? '—'} />
          <Field label="Statut provider" value={provider.providerStatus ?? '—'} />
          <Field
            label="Soumis le"
            value={provider.submittedAt ? DATE_TIME.format(provider.submittedAt) : '—'}
          />
          <Field
            label="Réconcilié le"
            value={provider.reconciledAt ? DATE_TIME.format(provider.reconciledAt) : '—'}
          />
          <Field label="Clé d’idempotence" value={provider.providerIdempotencyKey ?? '—'} />
        </dl>
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Écritures de grand livre
        </Text>
        {ledgerEntries.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Aucune écriture"
              description="Aucun débit n’a encore été enregistré pour cette demande."
            />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-[length:var(--wariba-font-size-body-sm)]">
              <caption className="sr-only">Écritures liées à ce payout</caption>
              <thead className="text-[color:var(--wariba-text-secondary)]">
                <tr>
                  <th scope="col" className="p-2 font-semibold">
                    Horodatage
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Type
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Montant
                  </th>
                  <th scope="col" className="p-2 font-semibold">
                    Compense
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-[color:var(--wariba-border-subtle)]"
                  >
                    <td className="whitespace-nowrap p-2">
                      <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                        {DATE_TIME.format(entry.occurredAt)}
                      </span>
                    </td>
                    <td className="p-2">{entry.entryType}</td>
                    <td className="p-2">
                      <span className="wariba-data">{entry.amount}</span>
                    </td>
                    <td className="p-2">
                      <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)]">
                        {entry.reversalOf ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {reversal.reversedAt ? (
          <Text variant="body-sm" color="secondary">
            Annulé le {DATE_TIME.format(reversal.reversedAt)} — {reversal.reversalReason ?? '—'}
          </Text>
        ) : null}
      </Card>

      {detail.reconciliationEvidence ? (
        <Card padding="comfortable">
          <Text as="h2" variant="heading-sm">
            Réconciliation
          </Text>
          {detail.reconciliationEvidence.runs.length === 0 ? (
            <Text variant="body-sm" color="secondary">
              Aucune réconciliation enregistrée.
            </Text>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {detail.reconciliationEvidence.runs.map((run) => (
                <li
                  key={run.id}
                  className="flex flex-wrap items-baseline gap-2 text-[length:var(--wariba-font-size-body-sm)]"
                >
                  <span className="wariba-data text-[length:var(--wariba-font-size-data-sm)] text-[color:var(--wariba-text-secondary)]">
                    {DATE_TIME.format(run.executedAt)}
                  </span>
                  <Badge variant={run.status === 'matched' ? 'success' : 'danger'}>
                    {run.status}
                  </Badge>
                  <span className="wariba-data">
                    {run.storedAccountBalance} / {run.reconstructedAccountBalance}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {detail.auditEvidence ? (
        <Card padding="comfortable">
          <Text as="h2" variant="heading-sm">
            Audit
          </Text>
          {detail.auditEvidence.events.length === 0 ? (
            <Text variant="body-sm" color="secondary">
              Aucun événement d’audit pour cette demande.
            </Text>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {detail.auditEvidence.events.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-baseline gap-2 text-[length:var(--wariba-font-size-body-sm)]"
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
