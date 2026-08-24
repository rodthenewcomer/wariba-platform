import Link from 'next/link';
import { Badge, Card, EmptyState, Text } from '@wariba/ui';
import { buildControlSupportTicketView, staffRoleSatisfies } from '@wariba/application';
import { requireControlArea } from '../../../../../lib/staff-auth';
import { getDb } from '../../../../../lib/db';
import { EvidenceTable } from '../../../../../components/support/EvidenceTable';
import { ControlTicketActions } from './ControlTicketActions';

export const dynamic = 'force-dynamic';

/**
 * One request, as an operator sees it.
 *
 * ## Everything needed to answer, on one page
 *
 * Metadata, the trader, the linked account's summary, the whole conversation,
 * the correlation id, and the linked contestation when there is one. §11's
 * point is that an operator should not have to open Supabase to answer a
 * question, and the way to fail that is to make them go and find the account
 * themselves.
 *
 * ## What is still deliberately absent
 *
 * No staff-only notes field. An internal note attached to a support thread is
 * a second, invisible conversation about a person, and it is exactly the thing
 * that leaks the first time an export or a subject-access request happens.
 * When one is genuinely needed it should be a modelled, audited object, not a
 * text column added quietly.
 */
export default async function ControlSupportTicketPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const session = await requireControlArea('support');
  const { publicId } = await params;

  const ticket = await buildControlSupportTicketView(getDb(), { publicId });
  if (!ticket) {
    return (
      <EmptyState
        title="Demande introuvable"
        description="Cette référence n’existe pas."
        action={<Link href="/control/support">Retour à la file</Link>}
      />
    );
  }

  // The role check that decides what renders. The Server Actions repeat it.
  const canAct = staffRoleSatisfies(session.role, 'support');
  const isSettled = ticket.status === 'closed';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Text as="h1" variant="heading-lg">
            <span className="wariba-data">{ticket.publicId}</span>
          </Text>
          <Badge variant="neutral">{ticket.statusLabel}</Badge>
          {ticket.contestation ? <Badge variant="warning">Contestation</Badge> : null}
        </div>
        <Link href="/control/support">Retour à la file</Link>
      </div>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          {ticket.subject}
        </Text>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <EvidenceTable
            caption="Demande"
            testId="control-ticket-meta"
            rows={[
              { label: 'Trader', value: ticket.traderEmail },
              { label: 'Catégorie', value: ticket.categoryLabel },
              { label: 'Priorité', value: ticket.priority },
              { label: 'Opérateur', value: ticket.assignedLabel },
              { label: 'Ouverte le', value: ticket.createdAtLabel, numeric: true },
              { label: 'Ancienneté', value: ticket.ageLabel },
              { label: 'Dernière activité', value: ticket.updatedAtLabel, numeric: true },
              { label: 'Correlation ID', value: ticket.correlationId, numeric: true },
            ]}
          />
          {ticket.accountRows.length > 0 ? (
            <div className="flex flex-col gap-3">
              <EvidenceTable
                caption="Compte lié"
                testId="control-ticket-account"
                rows={ticket.accountRows}
              />
              {ticket.accountPublicId ? (
                <Link href={`/control/accounts?q=${encodeURIComponent(ticket.accountPublicId)}`}>
                  Ouvrir le compte dans Accounts
                </Link>
              ) : null}
            </div>
          ) : (
            <Text variant="body-sm" color="secondary">
              Aucun compte rattaché à cette demande.
            </Text>
          )}
        </div>

        {ticket.contestation ? (
          <div className="mt-4">
            <Link href={ticket.contestation.href} data-testid="control-ticket-contestation">
              Contestation {ticket.contestation.publicId} — {ticket.contestation.statusLabel}
            </Link>
          </div>
        ) : null}
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Conversation
        </Text>
        <ol className="mt-4 flex flex-col divide-y divide-[color:var(--wariba-border-subtle)]">
          {ticket.messages.map((message, index) => (
            <li
              key={`${message.timestampLabel}-${index}`}
              data-testid="control-ticket-message"
              data-author={message.isStaff ? 'staff' : message.isSystem ? 'system' : 'trader'}
              className="py-3"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Text variant="label-sm" color={message.isStaff ? 'primary' : 'secondary'}>
                  {message.authorLabel}
                </Text>
                <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-secondary)]">
                  {message.timestampLabel}
                </span>
              </div>
              <p className="mt-1.5 max-w-[80ch] whitespace-pre-wrap break-words text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-primary)]">
                {message.body}
              </p>
            </li>
          ))}
        </ol>
      </Card>

      <Card padding="comfortable">
        <Text as="h2" variant="heading-sm">
          Actions
        </Text>
        <div className="mt-4">
          <ControlTicketActions
            publicId={ticket.publicId}
            canAct={canAct}
            assignedToMe={ticket.assignedStaffId === session.userId}
            isSettled={isSettled}
          />
        </div>
      </Card>
    </div>
  );
}
