import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildSupportTicketView, type SupportTone } from '@wariba/application';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { getDb } from '../../../../lib/db';
import { ActionLink } from '../../../../components/hub/Action';
import { HubEmptyState } from '../../../../components/hub/HubEmptyState';
import { Surface, SurfaceTitle } from '../../../../components/hub/Surface';
import { StatusPill, type PillTone } from '../../../../components/hub/StatusPill';
import { ReplyComposer } from './ReplyComposer';

export const dynamic = 'force-dynamic';

const TONE: Record<SupportTone, PillTone> = {
  neutral: 'neutral',
  progress: 'progress',
  attention: 'attention',
  success: 'success',
  muted: 'neutral',
};

/**
 * A request, and its conversation.
 *
 * ## Not a chat app
 *
 * §7.4 is explicit about this and it is the right instinct. There are no
 * opposing bubbles, no avatars, no read receipts and no tails. Each message is
 * a block with an author line and a timestamp above it, and the two sides are
 * distinguished by a left rule and a surface — the way an operational record
 * reads, not the way a messaging app does. A trader disputing a terminated
 * account should not be looking at something styled like a group chat.
 *
 * ## Existence is not confirmed to a stranger
 *
 * A reference belonging to someone else and one that was never issued produce
 * the same page: "Cette demande n'est pas accessible." The read is already
 * scoped by `user_id` in the query, so this branch is what a *successful*
 * lookup of someone else's reference looks like — nothing.
 */
export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/support/demandes/${encodeURIComponent(publicId)}`);

  const ticket = await buildSupportTicketView(getDb(), { userId: user.id, publicId });

  if (!ticket) {
    return (
      <div className="max-w-2xl">
        <HubEmptyState
          icon="support"
          title="Cette demande n’est pas accessible."
          description="La référence n’existe pas ou n’appartient pas à votre compte."
          action={
            <ActionLink href="/support" variant="secondary">
              Retour au support
            </ActionLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Surface className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span
            className="wariba-data text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-secondary)]"
            data-testid="ticket-reference"
          >
            {ticket.publicId}
          </span>
          <StatusPill tone={TONE[ticket.tone]} size="sm">
            {ticket.statusLabel}
          </StatusPill>
        </div>
        <h2
          className="mt-2 text-[length:var(--wariba-font-size-heading-sm)] font-semibold leading-snug text-[color:var(--wariba-text-primary)]"
          data-testid="ticket-subject"
        >
          {ticket.subject}
        </h2>
        {/* What happens next, in a sentence. A status word alone never says
            whose turn it is, and `waiting_for_user` is useless without it. */}
        <p
          className="mt-2 max-w-[60ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]"
          data-testid="ticket-next-action"
        >
          {ticket.nextAction}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {(
            [
              ['Catégorie', ticket.categoryLabel, false],
              ['Ouverte le', ticket.createdAtLabel, true],
              ['Dernière activité', ticket.updatedAtLabel, true],
              ...(ticket.accountPublicId
                ? ([['Compte', ticket.accountPublicId, true]] as const)
                : []),
            ] as readonly (readonly [string, string, boolean])[]
          ).map(([label, value, numeric]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                {label}
              </dt>
              {/*
               * Wraps rather than truncates.
               *
               * At 390 the two-column grid gives each cell about 165px, and a
               * medium French date does not fit. Truncating produced
               * "23 août 2026, 20…" — a timestamp a trader cannot read out and
               * an operator cannot look up, which is worse than a second line.
               */}
              <dd
                className={`mt-0.5 break-words text-[length:var(--wariba-font-size-body-sm)] font-medium text-[color:var(--wariba-text-primary)] ${numeric ? 'wariba-data' : ''}`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {ticket.contestation ? (
          <Link
            href={ticket.contestation.href}
            data-testid="ticket-contestation-link"
            className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-[10px] border border-[color:var(--wariba-accent-amber-edge)] bg-[color:var(--wariba-accent-amber-wash)] px-3.5 py-2.5 text-[length:var(--wariba-font-size-body-sm)]"
          >
            <span className="text-[color:var(--wariba-text-primary)]">
              Contestation{' '}
              <span className="wariba-data font-semibold">{ticket.contestation.publicId}</span> —{' '}
              {ticket.contestation.statusLabel}
            </span>
            <span className="shrink-0 font-semibold text-[color:var(--wariba-accent-amber)]">
              Voir
            </span>
          </Link>
        ) : null}
      </Surface>

      <section className="flex flex-col gap-3" aria-label="Conversation">
        <SurfaceTitle>Conversation</SurfaceTitle>
        <Surface className="p-0">
          <ol className="flex flex-col divide-y divide-[color:var(--warix-border-subtle)]">
            {ticket.messages.map((message, index) => (
              <li
                key={`${message.timestampLabel}-${index}`}
                data-testid="ticket-message"
                data-author={message.isTrader ? 'trader' : message.isSystem ? 'system' : 'staff'}
                className={`px-4 py-4 sm:px-5 ${
                  message.isSystem ? 'bg-[color:var(--warix-surface-raised)]' : ''
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span
                    className={`text-[length:var(--wariba-font-size-label-sm)] font-semibold ${
                      message.isTrader
                        ? 'text-[color:var(--wariba-text-secondary)]'
                        : 'text-[color:var(--wariba-accent-indigo)]'
                    }`}
                  >
                    {message.authorLabel}
                  </span>
                  <span className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                    {message.timestampLabel}
                  </span>
                </div>
                <p
                  className={`mt-1.5 max-w-[68ch] whitespace-pre-wrap break-words text-[length:var(--wariba-font-size-body-sm)] leading-relaxed ${
                    message.isSystem
                      ? 'text-[color:var(--wariba-text-secondary)]'
                      : 'text-[color:var(--wariba-text-primary)]'
                  }`}
                >
                  {message.body}
                </p>
              </li>
            ))}
          </ol>
        </Surface>
      </section>

      {ticket.canReply ? (
        <Surface className="p-5 sm:p-6">
          <ReplyComposer publicId={ticket.publicId} />
        </Surface>
      ) : (
        <Surface tone="raised" className="p-5">
          <p className="text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
            Cette demande est clôturée. Ouvrez une nouvelle demande si le sujet se représente.
          </p>
          <div className="mt-3">
            <ActionLink href="/support/nouveau" variant="secondary" size="sm">
              Nouvelle demande
            </ActionLink>
          </div>
        </Surface>
      )}

      <p className="wariba-data text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
        Référence technique : {ticket.correlationId}
      </p>
    </div>
  );
}
