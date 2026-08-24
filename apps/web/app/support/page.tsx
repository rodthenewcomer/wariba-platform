import { buildSupportHomeView } from '@wariba/application';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { getDb } from '../../lib/db';
import { ActionLink } from '../../components/hub/Action';
import { HubEmptyState } from '../../components/hub/HubEmptyState';
import { PageHeader } from '../../components/hub/PageHeader';
import { Surface, SurfaceTitle } from '../../components/hub/Surface';
import { HubHeaderSlot } from '../(platform)/HubHeaderSlot';
import { PublicSupportIntro } from './PublicSupportIntro';
import { SupportHelpSearch } from './SupportHelpSearch';
import { SupportRequestRow } from './SupportRequestRow';

// The list of a trader's own requests changes the moment an operator answers.
// Never statically cached, same reasoning as /hub and /payouts.
export const dynamic = 'force-dynamic';

/**
 * Support — the authenticated home.
 *
 * ## What a trader came here for
 *
 * In order: an answer they can find themselves, the state of a request they
 * already sent, and a way to send a new one. The page is built in that order
 * and nothing else competes for the space — no card grid, no metrics, no
 * "articles populaires" nobody measured.
 *
 * ## Contestations sit apart
 *
 * A contestation is not a request with a different label. It challenges a
 * decision WARIBA recorded, it is reviewed against evidence, and it has its
 * own outcome. Listing the two together would teach a trader that every
 * complaint is a financial dispute — and would bury the dispute among the
 * questions. The section only renders when one exists.
 */
export default async function SupportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The layout already picked the marketing shell for this case; the page
  // supplies what goes inside it.
  if (!user) return <PublicSupportIntro />;

  const view = await buildSupportHomeView(getDb(), { userId: user.id });
  const hasAnyRequest = view.openTickets.length > 0 || view.settledTickets.length > 0;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <HubHeaderSlot>
        <ActionLink href="/support/nouveau" size="sm" data-testid="header-new-request">
          Nouvelle demande
        </ActionLink>
      </HubHeaderSlot>

      <PageHeader description="Cherchez d’abord dans l’aide. Si la réponse n’y est pas, ouvrez une demande : elle est suivie sous une référence et rattachée aux preuves du compte concerné." />

      <SupportHelpSearch />

      <section className="flex flex-col gap-3" aria-label="Demandes en cours">
        <SurfaceTitle>Demandes en cours</SurfaceTitle>
        {view.openTickets.length === 0 ? (
          <HubEmptyState
            icon="support"
            compact
            title="Vous n’avez aucune demande en cours."
            description={
              hasAnyRequest
                ? 'Vos demandes traitées restent consultables plus bas.'
                : 'Ouvrez une demande pour toute question sur un compte, une commande ou une décision de risque.'
            }
            action={
              <ActionLink href="/support/nouveau" icon="support" data-testid="empty-new-request">
                Nouvelle demande
              </ActionLink>
            }
          />
        ) : (
          <Surface className="overflow-hidden p-0">
            <ul className="flex flex-col divide-y divide-[color:var(--warix-border-subtle)]">
              {view.openTickets.map((ticket) => (
                <li key={ticket.publicId}>
                  <SupportRequestRow
                    href={ticket.href}
                    reference={ticket.publicId}
                    categoryLabel={ticket.categoryLabel}
                    title={ticket.subject}
                    statusLabel={ticket.statusLabel}
                    tone={ticket.tone}
                    ageLabel={ticket.ageLabel}
                    contestationReference={ticket.contestationPublicId}
                  />
                </li>
              ))}
            </ul>
          </Surface>
        )}
      </section>

      {view.openTickets.length > 0 ? (
        <div>
          <ActionLink href="/support/nouveau" variant="secondary" data-testid="list-new-request">
            Nouvelle demande
          </ActionLink>
        </div>
      ) : null}

      {view.contestations.length > 0 ? (
        <section className="flex flex-col gap-3" aria-label="Contestations">
          <SurfaceTitle>Contestations</SurfaceTitle>
          <Surface className="overflow-hidden p-0">
            <ul className="flex flex-col divide-y divide-[color:var(--warix-border-subtle)]">
              {view.contestations.map((contestation) => (
                <li key={contestation.publicId}>
                  <SupportRequestRow
                    testId="contestation-row"
                    href={contestation.href}
                    reference={contestation.publicId}
                    categoryLabel={contestation.targetLabel}
                    title={contestation.reasonLabel}
                    statusLabel={contestation.statusLabel}
                    tone={contestation.tone}
                    ageLabel={contestation.ageLabel}
                  />
                </li>
              ))}
            </ul>
          </Surface>
        </section>
      ) : null}

      {view.settledTickets.length > 0 ? (
        <section className="flex flex-col gap-3" aria-label="Demandes traitées">
          <SurfaceTitle>Demandes traitées</SurfaceTitle>
          <Surface className="overflow-hidden p-0">
            <ul className="flex flex-col divide-y divide-[color:var(--warix-border-subtle)]">
              {view.settledTickets.map((ticket) => (
                <li key={ticket.publicId}>
                  <SupportRequestRow
                    testId="settled-request-row"
                    href={ticket.href}
                    reference={ticket.publicId}
                    categoryLabel={ticket.categoryLabel}
                    title={ticket.subject}
                    statusLabel={ticket.statusLabel}
                    tone={ticket.tone}
                    ageLabel={ticket.ageLabel}
                    contestationReference={ticket.contestationPublicId}
                  />
                </li>
              ))}
            </ul>
          </Surface>
        </section>
      ) : null}

      {/*
       * The one place attachments are mentioned: not at all.
       *
       * SUPPORT_ATTACHMENTS = deferred. There is no upload button that opens a
       * picker and does nothing, and no "bientôt disponible" badge — a control
       * that cannot do its job is worse than its absence, and the private-beta
       * support flow does not need one. Text plus WARIBA's own recorded
       * evidence is what a request is decided on.
       */}
      <p className="text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-text-tertiary)]">
        Ne partagez jamais de mot de passe, de code de connexion ou de donnée bancaire dans une
        demande. WARIBA ne vous les demandera jamais.
      </p>
    </div>
  );
}
