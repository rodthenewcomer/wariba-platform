import { redirect } from 'next/navigation';
import { buildContestationView, type SupportTone } from '@wariba/application';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { getDb } from '../../../../lib/db';
import { ActionLink } from '../../../../components/hub/Action';
import { HubEmptyState } from '../../../../components/hub/HubEmptyState';
import { Surface, SurfaceTitle } from '../../../../components/hub/Surface';
import { StatusPill, type PillTone } from '../../../../components/hub/StatusPill';
import { EvidenceFillsTable, EvidenceTable } from '../../../../components/support/EvidenceTable';
import { helpLinkForReasonCode } from '../../../../lib/help-links';

export const dynamic = 'force-dynamic';

const TONE: Record<SupportTone, PillTone> = {
  neutral: 'neutral',
  progress: 'progress',
  attention: 'attention',
  success: 'success',
  muted: 'neutral',
};

/**
 * A contestation, from the trader's side.
 *
 * ## Three things, in this order
 *
 * The decision as WARIBA recorded it. What the trader said about it. What an
 * operator concluded, once they have. Putting the evidence first is the point:
 * a page that opened with the trader's own statement would read as an appeal
 * form, and this is a record.
 *
 * ## The evidence is live
 *
 * Every figure below is read from `app.risk_violations` and its neighbours on
 * each render, never from a copy stored on the contestation. The contestation
 * holds identifiers; the numbers stay where the risk engine wrote them.
 *
 * ## The outcome is not dressed up
 *
 * `Décision maintenue` says the original decision stands and the account is
 * unchanged. `Dossier escaladé` says the case went beyond what an operator may
 * decide alone. Neither is softened into a word that sounds like a win.
 */
export default async function ContestationPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/support/contestations/${encodeURIComponent(publicId)}`);

  const contestation = await buildContestationView(getDb(), { userId: user.id, publicId });

  if (!contestation) {
    return (
      <div className="max-w-2xl">
        <HubEmptyState
          icon="shield"
          title="Cette contestation n’est pas accessible."
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

  const ruleHelp = helpLinkForReasonCode(contestation.evidence?.ruleCode);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Surface className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span
            className="wariba-data text-[length:var(--wariba-font-size-label-md)] font-semibold text-[color:var(--wariba-text-secondary)]"
            data-testid="contestation-reference"
          >
            {contestation.publicId}
          </span>
          <StatusPill tone={TONE[contestation.tone]} size="sm">
            {contestation.statusLabel}
          </StatusPill>
        </div>
        <h2 className="mt-2 text-[length:var(--wariba-font-size-heading-sm)] font-semibold text-[color:var(--wariba-text-primary)]">
          {contestation.targetLabel}
        </h2>
        <p className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
          {contestation.reasonLabel}
        </p>
        <p
          className="mt-3 max-w-[62ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]"
          data-testid="contestation-next-action"
        >
          {contestation.nextAction}
        </p>
        <p className="mt-2 max-w-[62ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
          Ouverte le {contestation.openedAtLabel}. Un examen ne réécrit jamais ce qui s’est passé
          sur votre compte : les éléments enregistrés restent tels quels.
        </p>
        <div className="mt-4">
          <ActionLink href={contestation.ticketHref} variant="secondary" size="sm">
            Voir la demande {contestation.ticketPublicId}
          </ActionLink>
        </div>
      </Surface>

      {contestation.evidence ? (
        <section className="flex flex-col gap-3" aria-label="Décision contestée">
          <SurfaceTitle>Décision contestée</SurfaceTitle>
          <Surface className="p-5 sm:p-6">
            {/*
             * `RISK_MAXIMUM_LOSS_BREACH` était affiché ici, à droite du titre.
             * C'est la clé qui relie la ligne de violation à son libellé —
             * utile à un opérateur, illisible pour la personne dont c'est le
             * compte. WARIBA Control la garde ; cette page garde le nom de la
             * règle et la phrase qui dit ce qui s'est passé.
             */}
            <h3 className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              {contestation.evidence.ruleLabel}
            </h3>
            {contestation.evidence.narrative ? (
              <p
                className="mt-1.5 max-w-[64ch] text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]"
                data-testid="contestation-narrative"
              >
                {contestation.evidence.narrative}
              </p>
            ) : null}
            <p className="mt-1.5 text-[length:var(--wariba-font-size-body-sm)] text-[color:var(--wariba-text-secondary)]">
              Conséquence : {contestation.evidence.consequenceLabel}
            </p>
            {/*
             * The rule, explained — §12's reason-code mapping.
             *
             * A trader reading the evidence of a decision they disagree with is
             * the single most useful moment to offer the article that explains
             * how the rule is calculated. The link resolves from the rule code,
             * so it cannot drift from the article that owns the subject.
             */}
            {ruleHelp ? (
              <div className="mt-3">
                <ActionLink
                  href={ruleHelp.href}
                  variant="secondary"
                  size="sm"
                  data-testid="contestation-rule-help"
                >
                  Comprendre cette règle
                </ActionLink>
              </div>
            ) : null}
            <div className="mt-4">
              <EvidenceTable rows={contestation.evidence.rows} testId="contestation-evidence" />
            </div>

            {contestation.evidence.orderRows.length > 0 ? (
              <div className="mt-6">
                <EvidenceTable
                  rows={contestation.evidence.orderRows}
                  caption="Ordre déclencheur"
                  testId="contestation-order-evidence"
                />
              </div>
            ) : null}

            {contestation.evidence.fills.length > 0 ? (
              <div className="mt-6">
                <p className="pb-2 text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[var(--wariba-letter-spacing-wide)] text-[color:var(--wariba-text-tertiary)]">
                  Exécutions
                </p>
                <EvidenceFillsTable fills={contestation.evidence.fills} />
              </div>
            ) : null}
          </Surface>
        </section>
      ) : null}

      <section className="flex flex-col gap-3" aria-label="Votre explication">
        <SurfaceTitle>Votre explication</SurfaceTitle>
        <Surface tone="raised" className="p-5">
          <p
            className="max-w-[68ch] whitespace-pre-wrap break-words text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-primary)]"
            data-testid="contestation-statement-text"
          >
            {contestation.traderStatement}
          </p>
        </Surface>
      </section>

      {contestation.decisionLabel ? (
        <section className="flex flex-col gap-3" aria-label="Décision de WARIBA">
          <SurfaceTitle>Décision de WARIBA</SurfaceTitle>
          <Surface className="p-5 sm:p-6" data-testid="contestation-outcome">
            <p className="text-[length:var(--wariba-font-size-body-md)] font-semibold text-[color:var(--wariba-text-primary)]">
              {contestation.decisionLabel}
            </p>
            {contestation.decisionReason ? (
              <p className="mt-2 max-w-[66ch] whitespace-pre-wrap text-[length:var(--wariba-font-size-body-sm)] leading-relaxed text-[color:var(--wariba-text-secondary)]">
                {contestation.decisionReason}
              </p>
            ) : null}
            {contestation.resolvedAtLabel ? (
              <p className="wariba-data mt-3 text-[length:var(--wariba-font-size-label-sm)] text-[color:var(--wariba-text-tertiary)]">
                {contestation.resolvedAtLabel}
              </p>
            ) : null}
          </Surface>
        </section>
      ) : null}

      {/*
       * La référence, c'est CTS-01017.
       *
       * Cette page affichait un UUID de corrélation sous la phrase « donnez-lui
       * cette référence ». Un trader au téléphone lisant
       * « babba39e-2efb-4a4f-b3a5-6f2bfa6bcd66 » se trompe, et l'opérateur n'en
       * a pas besoin : la référence publique retrouve le dossier, et l'UUID est
       * relié dans WARIBA Control. Il reste à l'audit, pas à l'écran.
       */}
      <p className="text-[length:var(--wariba-font-size-label-sm)] leading-relaxed text-[color:var(--wariba-text-tertiary)]">
        Si vous contactez le support à propos de ce dossier, donnez-lui la référence{' '}
        <span className="wariba-data select-all">{contestation.publicId}</span>.
      </p>
    </div>
  );
}
