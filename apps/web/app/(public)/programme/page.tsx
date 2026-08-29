import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { listCanonicalV2Offers } from '@wariba/application';
import { AccountToken, CloseIcon, PayoutLadder, RiskCorridor } from '@wariba/ui';
import { Reveal } from '../../../components/motion/Reveal';
import { DrawPath } from '../../../components/motion/DrawPath';
import {
  FAMILY_META,
  FAMILY_ORDER,
  formatRate,
  formatXof,
} from '../../../components/commerce/offer-ui';
import { getDb } from '../../../lib/db';

/* The page reads the published policy, so it cannot be served from a cache
   that outlives a policy change. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Comment ça marche — WARIBA',
  description:
    'Le parcours WARIBA V2 de bout en bout : évaluation, compte Performance, règles de risque et versements.',
};

const FAMILY_TOKEN = {
  WARIBA_ONE: 'one',
  WARIBA_FLEX: 'flex',
  WARIBA_INSTANT: 'instant',
} as const;

/**
 * « Comment ça marche » — 3.4.5R §22.6.
 *
 * ## Pourquoi cette page existe de nouveau
 *
 * Elle avait été remplacée par une redirection vers `/offres`, pour une bonne
 * raison : l'ancienne version listait des règles V1 en dur et devenait le
 * second endroit où la vérité produit vivait. Mais une redirection laisse le
 * parcours sans explication — on tombe sur un catalogue avant d'avoir compris
 * ce qu'on achète — et la redirection elle-même cassait la construction de
 * production, parce qu'une page qui ne fait que rediriger sans
 * `force-dynamic` est pré-rendue.
 *
 * La page est donc reconstruite avec la règle qui manquait la première fois :
 * **aucun chiffre n'est écrit ici**. Objectif, Limite quotidienne, Perte
 * maximale, réserve, Journées Performance et barème de partage viennent tous
 * du catalogue canonique. La page explique la mécanique ; le serveur fournit
 * les valeurs.
 */
export default async function ProgramPage() {
  const offers = await listCanonicalV2Offers(getDb());
  const references = FAMILY_ORDER.map((family) =>
    offers.find((offer) => offer.productFamily === family && offer.sizeCode === '10K'),
  ).filter((offer) => offer !== undefined);
  const one = references.find((offer) => offer.productFamily === 'WARIBA_ONE');

  return (
    <>
      {/* ── Héros ── */}
      <section className="commerce-hero commerce-ambient">
        <div className="commerce-shell pb-16 pt-16 lg:pb-24 lg:pt-24">
          <p className="commerce-kicker">Le parcours, de bout en bout</p>
          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
            <h1 className="commerce-display">Comprendre avant de payer.</h1>
            <p className="commerce-lead">
              Ce que vous achetez, ce que la plateforme mesure, ce qui met fin à un compte et ce que
              vous gardez. Tous les chiffres de cette page viennent de la version de règles que
              votre compte conservera.
            </p>
          </div>
        </div>
      </section>

      {/* ── Étape 1 : choisir ── */}
      <section className="commerce-band">
        <div className="commerce-shell py-20 lg:py-24">
          <Reveal>
            <p className="commerce-kicker">Étape 1</p>
            <h2 className="commerce-section-title mt-5">Choisir un parcours et une taille.</h2>
            <p className="commerce-lead mt-5">
              Trois parcours se distinguent par une seule question : quand payez-vous, et
              commencez-vous par une évaluation ?
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {references.map((offer, index) => {
              const meta = FAMILY_META[offer.productFamily];
              return (
                <Reveal key={offer.offerId} delay={index * 0.07}>
                  <article className="commerce-panel flex h-full flex-col items-start gap-5 p-6 sm:flex-row lg:flex-col">
                    <AccountToken
                      sizeCode={offer.sizeCode}
                      family={FAMILY_TOKEN[offer.productFamily]}
                      width={132}
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="commerce-choice-index">{meta.short}</p>
                      <h3 className="mt-2 text-lg font-semibold text-[color:var(--wariba-color-ink-50)]">
                        {offer.entryPhase === 'evaluation'
                          ? 'Évaluation, puis Performance'
                          : 'Performance immédiate'}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                        {meta.description}
                      </p>
                      <p className="mt-4 font-mono text-sm tabular-nums text-[color:var(--wariba-color-ink-100)]">
                        {offer.productFamily === 'WARIBA_FLEX'
                          ? `${formatXof(offer.upfrontPrice)} aujourd’hui, puis ${formatXof(offer.activationPrice)}`
                          : `${formatXof(offer.upfrontPrice)} · paiement unique`}
                      </p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Étape 2 : les limites ── */}
      {one ? (
        <section>
          <div className="commerce-shell py-20 lg:py-24">
            <Reveal>
              <p className="commerce-kicker">Étape 2</p>
              <h2 className="commerce-section-title mt-5">
                Trader entre deux bords, pas vers une cible.
              </h2>
              <p className="commerce-lead mt-5">
                Une barre de progression ne montre qu’une extrémité. Ce qui met fin à un compte est
                à l’autre bout — c’est donc les deux qui sont affichés, en permanence, dans votre
                espace.
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="commerce-panel mt-10 p-6 sm:p-8">
                <RiskCorridor
                  floorLabel={`−${formatXof(one.evaluationRules?.maximumLossAmount ?? '0')}`}
                  targetLabel={`+${formatRate(one.evaluationRules?.profitTargetRate ?? '0')}`}
                  positionPercent={38}
                  dailyBandPercent={28}
                  currentLabel="Exemple de règle sur une taille 10K — pas un compte réel"
                />
                <dl className="mt-8 grid gap-px overflow-hidden rounded-[var(--wariba-radius-xl)] border border-[color:var(--commerce-rule)] bg-[color:var(--commerce-rule)] sm:grid-cols-3">
                  <div className="commerce-stat">
                    <dt>Limite quotidienne</dt>
                    <dd>{formatRate(one.evaluationRules?.dailyLossRate ?? '0')}</dd>
                  </div>
                  <div className="commerce-stat">
                    <dt>Perte maximale</dt>
                    <dd>{formatRate(one.evaluationRules?.maximumLossRate ?? '0')}</dd>
                  </div>
                  <div className="commerce-stat">
                    <dt>Meilleure journée</dt>
                    <dd>{formatRate(one.performanceRules.bestDayMaximumRate)}</dd>
                  </div>
                </dl>
                <p className="mt-5 text-sm leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                  La Limite quotidienne est souple : elle vous empêche d’ouvrir de nouvelles
                  positions jusqu’à la prochaine réinitialisation, elle ne clôt pas le compte. La
                  Perte maximale, elle, y met fin.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ── Étape 3 : la réussite ── */}
      {one ? (
        <section className="commerce-band">
          <div className="commerce-shell py-20 lg:py-24">
            <Reveal>
              <p className="commerce-kicker">Étape 3</p>
              <h2 className="commerce-section-title mt-5">Réussir, puis passer en Performance.</h2>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="commerce-rule-scene mt-10" data-tone="accent">
                <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                      Objectif de performance · WARIBA ONE
                    </p>
                    <p className="commerce-rule-figure mt-4">
                      {formatRate(one.evaluationRules?.profitTargetRate ?? '0')}
                    </p>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-white/85">
                      Seul le profit net réalisé compte. Une fois l’objectif atteint sans avoir
                      franchi la Perte maximale, le serveur valide le passage et votre compte
                      Performance s’ouvre.
                    </p>
                  </div>
                  <svg viewBox="0 0 300 150" className="w-full" aria-hidden="true">
                    <line
                      x1="8"
                      y1="130"
                      x2="292"
                      y2="130"
                      stroke="rgb(255 255 255 / 0.3)"
                      strokeWidth="1.5"
                      strokeDasharray="4 5"
                    />
                    <DrawPath
                      d="M12 124 C 68 118, 104 104, 148 82 S 232 36, 286 18"
                      stroke="#0B0D12"
                      strokeWidth={4}
                      length={400}
                    />
                    <circle cx="286" cy="18" r="7" fill="#0B0D12" />
                  </svg>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ── Étape 4 : les versements ── */}
      {one ? (
        <section>
          <div className="commerce-shell grid gap-12 py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:py-24">
            <Reveal>
              <p className="commerce-kicker">Étape 4</p>
              <h2 className="commerce-section-title mt-5">Demander un versement.</h2>
              <p className="commerce-lead mt-5">
                Un cycle s’ouvre après {one.performanceRules.performanceDaysRequired} Journées
                Performance. Une journée est qualifiante à partir de{' '}
                {formatRate(one.performanceRules.performanceDayThresholdRate)} de gain net. Votre
                part augmente à chaque cycle.
              </p>
              <Link href="/offres" className="commerce-primary-action mt-8">
                Comparer les 15 offres
              </Link>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="commerce-panel p-6 sm:p-8">
                <PayoutLadder
                  steps={one.performanceRules.payoutSplitSchedule.map((share, index) => ({
                    label: `Cycle ${index + 1}`,
                    share: formatRate(share),
                    state: index === 0 ? 'current' : 'upcoming',
                  }))}
                  caption="Une revue intervient après le cinquième cycle. Un plafond propre à la taille du compte s’applique à chaque versement."
                />
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ── Ce que ce n'est pas ── */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/wariba-support-team.webp"
          alt=""
          fill
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--wariba-color-ink-975)_30%,color-mix(in_srgb,var(--wariba-color-ink-975)_66%,transparent)_66%,transparent)]"
        />
        <div className="commerce-shell py-24 lg:py-28">
          <Reveal>
            <div className="max-w-xl">
              <p className="commerce-kicker">À dire clairement</p>
              <h2 className="commerce-section-title mt-5">Ce que WARIBA n’est pas.</h2>
              <ul className="mt-7 space-y-3">
                {[
                  'Ce n’est pas un compte de courtage : aucun dépôt, aucun capital confié.',
                  'Le montant affiché sur un compte est une unité de simulation.',
                  'Aucun résultat, aucun versement et aucun délai ne sont garantis.',
                  'Aucun compte réel n’est promis à l’issue du parcours.',
                ].map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-3 text-base leading-relaxed text-[color:var(--wariba-color-ink-200)]"
                  >
                    <CloseIcon
                      size="sm"
                      className="mt-1 shrink-0 text-[color:var(--wariba-accent-red)]"
                    />
                    {line}
                  </li>
                ))}
              </ul>
              <Link href="/legal/risques" className="commerce-secondary-action mt-8">
                Lire l’avertissement complet
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
