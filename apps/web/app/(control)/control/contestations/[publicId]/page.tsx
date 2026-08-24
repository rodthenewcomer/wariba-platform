import Link from 'next/link';
import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import { buildControlContestationView, staffCan } from '@wariba/application';
import { requireControlArea } from '../../../../../lib/staff-auth';
import { getDb } from '../../../../../lib/db';
import { EvidenceFillsTable, EvidenceTable } from '../../../../../components/support/EvidenceTable';
import { ControlContestationDecision } from './ControlContestationDecision';

export const dynamic = 'force-dynamic';

/**
 * A contestation, as the reviewer sees it.
 *
 * §12: « The operator should NOT have to query Supabase manually. » Everything
 * needed to decide is here — rule, threshold, observed value, occurrence time,
 * policy version, calculation version, the account transition it produced, the
 * trading day it was measured against, the triggering order and its fills, and
 * the correlation id.
 *
 * ## The same evidence the trader sees
 *
 * Rendered through `projectContestationEvidence`, the projection the trader's
 * own contestation page uses. A dispute in which the two sides read different
 * renderings of one event cannot be settled.
 *
 * ## The statement is labelled as a statement
 *
 * It sits under its own heading, below the evidence, and the heading says
 * whose account of events it is. The trader may explain; the explanation is
 * not evidence, and the layout should never let a reviewer forget which is
 * which.
 */
export default async function ControlContestationPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const session = await requireControlArea('contestations');
  const { publicId } = await params;

  const contestation = await buildControlContestationView(getDb(), { publicId });
  if (!contestation) {
    return (
      <EmptyState
        title="Contestation introuvable"
        description="Cette référence n’existe pas."
        action={<Link href="/control/contestations">Retour à la file</Link>}
      />
    );
  }

  const canReview = staffCan(session.role, 'dispute.review');
  const canResolve = staffCan(session.role, 'dispute.resolve');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Text as="h1" variant="heading-lg">
            <span className="wariba-data">{contestation.publicId}</span>
          </Text>
          <Badge variant="neutral">{contestation.statusLabel}</Badge>
          {contestation.decisionLabel ? (
            <Badge variant="review">{contestation.decisionLabel}</Badge>
          ) : null}
        </div>
        <Link href="/control/contestations">Retour à la file</Link>
      </div>

      <Card padding="comfortable">
        <div className="grid gap-6 md:grid-cols-2">
          <EvidenceTable
            caption="Contestation"
            testId="control-contestation-meta"
            rows={[
              { label: 'Trader', value: contestation.traderEmail },
              { label: 'Objet', value: contestation.targetLabel },
              { label: 'Motif', value: contestation.reasonLabel },
              { label: 'Compte', value: contestation.accountPublicId ?? '—', numeric: true },
              { label: 'Ouverte le', value: contestation.openedAtLabel, numeric: true },
              { label: 'Examinateur', value: contestation.reviewerLabel },
              ...(contestation.reviewedAtLabel
                ? [
                    {
                      label: 'Prise en examen',
                      value: contestation.reviewedAtLabel,
                      numeric: true,
                    },
                  ]
                : []),
              { label: 'Correlation ID', value: contestation.correlationId, numeric: true },
            ]}
          />
          <div className="flex flex-col gap-3">
            <EvidenceTable
              caption="Preuves référencées"
              testId="control-contestation-refs"
              rows={contestation.evidenceRefRows}
            />
            <Link href={contestation.ticketHref}>
              Voir la demande {contestation.ticketPublicId}
            </Link>
          </div>
        </div>
      </Card>

      {contestation.evidence ? (
        <Card padding="comfortable">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Text as="h2" variant="heading-sm">
              {contestation.evidence.ruleLabel}
            </Text>
            <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              {contestation.evidence.ruleCode}
            </span>
          </div>
          <Text variant="body-sm" color="secondary">
            Conséquence : {contestation.consequenceLabel}
          </Text>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <EvidenceTable
              caption="Décision"
              testId="control-contestation-evidence"
              rows={contestation.evidence.rows}
            />
            {contestation.evidence.orderRows.length > 0 ? (
              <EvidenceTable
                caption="Ordre déclencheur"
                testId="control-contestation-order"
                rows={contestation.evidence.orderRows}
              />
            ) : (
              <Text variant="body-sm" color="secondary">
                Aucun ordre déclencheur : la décision provient d’une finalisation de journée.
              </Text>
            )}
          </div>
          {contestation.evidence.fills.length > 0 ? (
            <div className="mt-6">
              <Text variant="label-sm" color="secondary">
                Exécutions
              </Text>
              <div className="mt-2">
                <EvidenceFillsTable fills={contestation.evidence.fills} />
              </div>
            </div>
          ) : null}
        </Card>
      ) : (
        <Card padding="comfortable">
          <Text variant="body-sm" color="warning">
            Les preuves de cette décision n’ont pas pu être chargées. Ne tranchez pas ce dossier
            sans elles.
          </Text>
        </Card>
      )}

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Déclaration du trader
        </Text>
        <Text variant="body-sm" color="secondary">
          Le récit du trader. Il complète les preuves ci-dessus, il ne les remplace pas.
        </Text>
        <p
          className="mt-3 max-w-[80ch] whitespace-pre-wrap break-words text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-primary)]"
          data-testid="control-contestation-statement"
        >
          {contestation.traderStatement}
        </p>
      </Card>

      {contestation.decisionLabel ? (
        <Card padding="comfortable">
          <Text as="h2" variant="heading-sm">
            Décision enregistrée
          </Text>
          <p className="mt-2 text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
            {contestation.decisionLabel}
          </p>
          {contestation.decisionReason ? (
            <p className="mt-2 max-w-[80ch] whitespace-pre-wrap text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
              {contestation.decisionReason}
            </p>
          ) : null}
          {contestation.resolvedAtLabel ? (
            <p className="wariba-data mt-3 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
              {contestation.resolvedAtLabel}
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Examen
        </Text>
        <div className="mt-4">
          <ControlContestationDecision
            publicId={contestation.publicId}
            canReview={canReview}
            canResolve={canResolve}
            isLive={contestation.isLive}
          />
        </div>
      </Card>
    </div>
  );
}
