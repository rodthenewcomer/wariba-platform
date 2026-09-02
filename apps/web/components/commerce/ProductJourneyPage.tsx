import Link from 'next/link';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { AccountToken, PayoutLadder, RiskCorridor } from '@wariba/ui';
import { OfferConfigurator } from './OfferConfigurator';
import { OneHero } from './one/OneHero';
import { OneHowItWorks } from './one/OneHowItWorks';
import { OneEvaluationRules } from './one/OneEvaluationRules';
import { Reveal } from '../motion/Reveal';
import { DrawPath } from '../motion/DrawPath';
import { FAMILY_META, formatMultiple, formatRate, formatSimulatedAmount, formatXof } from './offer-ui';

interface ProductJourneyPageProps {
  family: CanonicalOfferReadModel['productFamily'];
  offers: readonly CanonicalOfferReadModel[];
  sandboxCheckoutAvailable: boolean;
}

const FAMILY_TOKEN = {
  WARIBA_ONE: 'one',
  WARIBA_FLEX: 'flex',
  WARIBA_INSTANT: 'instant',
} as const;

/**
 * Each family owns a promise, said in four words, in its own voice.
 *
 * FLEX gets the longer, warmer version here that the mega-menu cannot afford:
 * a product page has the room to say the whole proposition, and «⁠payez moins
 * au départ⁠» alone reads as a discount rather than as a deferred second
 * payment. In the menu, precision wins; on the page, the sequence does.
 */
const FAMILY_PROMISE = {
  WARIBA_ONE: 'Une évaluation. Une seule étape.',
  WARIBA_FLEX: 'Commencez maintenant. Payez le reste après votre réussite.',
  WARIBA_INSTANT: 'Pas d’évaluation.',
} as const;

type Step = readonly [string, string, string];

const STEPS: Record<CanonicalOfferReadModel['productFamily'], readonly Step[]> = {
  WARIBA_INSTANT: [
    ['01', 'Choisissez votre taille', 'Le prix et les règles sont attachés à une version exacte.'],
    ['02', 'Entrez en Performance', 'Aucune évaluation, aucun objectif de profit à franchir.'],
    ['03', 'Constituez la réserve', 'Elle protège la suite du parcours, cycle après cycle.'],
    ['04', 'Demandez vos versements', 'Cinq Journées Performance ouvrent chaque cycle.'],
  ],
  WARIBA_FLEX: [
    ['01', 'Payez l’entrée', 'Un coût réduit, fixé en FCFA le jour de l’achat.'],
    ['02', 'Atteignez l’objectif', 'Seul le profit net réalisé compte.'],
    ['03', 'Activez après réussite', 'Le second montant était déjà figé lors de votre achat.'],
    ['04', 'Progressez en Performance', 'Réserve, Journées Performance et versements versionnés.'],
  ],
  WARIBA_ONE: [
    ['01', 'Choisissez votre taille', 'Un paiement unique, aucun frais d’activation.'],
    ['02', 'Atteignez l’objectif', 'Seul le profit net réalisé compte.'],
    ['03', 'Passez en Performance', 'Le passage suit la validation serveur de votre réussite.'],
    ['04', 'Progressez par cycles', 'Réserve, Journées Performance et versements versionnés.'],
  ],
};

/**
 * A product page — 3.4.5R §22.3–22.5.
 *
 * The shape is the same for the three families and the *scenes* differ, which
 * is the point: they are one brand with three arguments, not three products
 * with three designs.
 *
 * What each family gets that the others do not:
 *
 * - **ONE** — the target owns the rule scene. Its argument is proof.
 * - **FLEX** — a two-amount bridge sits above everything else. Its argument is
 *   the deferred payment, and that argument fails the moment a reader suspects
 *   a hidden second charge. Both amounts, the total, and what happens on
 *   failure are stated together, in that order, before the price panel.
 * - **INSTANT** — the rule scene is the entry itself: no evaluation. Its
 *   accent stays cobalt with a cyan edge rather than turning the page green,
 *   because a page you cannot recognise as WARIBA has cost more than it won.
 */
export function ProductJourneyPage({
  family,
  offers,
  sandboxCheckoutAvailable,
}: ProductJourneyPageProps) {
  const familyOffers = offers.filter((offer) => offer.productFamily === family);
  const reference = familyOffers.find((offer) => offer.sizeCode === '10K') ?? familyOffers[0];
  if (!reference) throw new Error(`No canonical V2 offer for ${family}.`);

  const meta = FAMILY_META[family];
  const evaluation = reference.evaluationRules;
  const performance = reference.performanceRules;
  const steps = STEPS[family];
  const isFlex = family === 'WARIBA_FLEX';
  const isOne = family === 'WARIBA_ONE';
  const anchor = `configurer-${meta.short.toLowerCase()}`;
  const rulesAnchor = `regle-${meta.short.toLowerCase()}`;

  /* The rule that owns the full-bleed scene, per family. */
  const heroRule = evaluation
    ? {
        kicker: `Règle 1 sur 1 · WARIBA ${meta.short}`,
        figure: formatRate(evaluation.maximumLossRate),
        title: 'Perte maximale',
        body: 'Elle suit votre plus haut de fin de journée. Restez au-dessus de la ligne : le reste de votre gestion vous appartient.',
      }
    : {
        kicker: `Point de départ · WARIBA ${meta.short}`,
        figure: '0',
        title: 'Évaluation à franchir',
        body: 'Vous commencez directement en Performance. En contrepartie, les limites de risque sont plus resserrées dès le premier jour.',
      };

  /*
   * For ONE, this is the funnel's first real buying moment — the visitor has
   * already read the lifecycle and the rules, so the size/price selector
   * moves up to sit right after them instead of waiting at the very bottom,
   * behind sections (WariX, Performance, FAQ) that don't exist on this page
   * yet. FLEX/INSTANT keep the original bottom placement unchanged. This is
   * the same `OfferConfigurator` either way — a reposition, not a rebuild.
   */
  const configuratorBlock = (
    <div id={anchor}>
      <OfferConfigurator
        offers={offers}
        sandboxCheckoutAvailable={sandboxCheckoutAvailable}
        initialFamily={family}
        compact
      />
    </div>
  );

  return (
    <>
      {/* ─────────────────────────  Héros  ───────────────────────── */}
      {isOne ? (
        <OneHero configuratorAnchor={anchor} rulesAnchor={rulesAnchor} />
      ) : (
        <section className="commerce-hero commerce-ambient">
          <div className="commerce-shell grid gap-12 pb-20 pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:pb-28 lg:pt-24">
            <div>
              <p className="commerce-kicker">
                WARIBA {meta.short} · {meta.eyebrow}
              </p>
              <h1 className="commerce-display mt-6">{FAMILY_PROMISE[family]}</h1>
              <p className="commerce-lead mt-6">{meta.description}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href={`#${anchor}`} className="commerce-primary-action">
                  Configurer {meta.short}
                </Link>
                <Link href="/offres" className="commerce-secondary-action">
                  Voir les autres parcours
                </Link>
              </div>
            </div>

            <Reveal delay={0.08}>
              <div className="commerce-hero-ledger">
                <div className="flex justify-center pb-6">
                  <AccountToken sizeCode="10K" family={FAMILY_TOKEN[family]} width={210} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-color-ink-300)]">
                  Repère · taille 10K
                </p>
                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <dt>{isFlex ? 'À régler aujourd’hui' : 'Paiement unique'}</dt>
                    <dd>{formatXof(reference.upfrontPrice)}</dd>
                  </div>
                  <div>
                    <dt>{evaluation ? 'Objectif' : 'Point de départ'}</dt>
                    <dd>{evaluation ? formatRate(evaluation.profitTargetRate) : 'Performance'}</dd>
                  </div>
                  <div>
                    <dt>Limite quotidienne</dt>
                    <dd>{formatRate(evaluation?.dailyLossRate ?? performance.dailyLossRate)}</dd>
                  </div>
                  <div>
                    <dt>Exposition totale</dt>
                    <dd>{formatMultiple(performance.grossExposureMaximumMultiple)}</dd>
                  </div>
                </dl>
                <p className="mt-6 border-t border-[color:var(--commerce-rule)] pt-5 text-xs leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                  Environnement de trading simulé. Le nominal n’est ni un dépôt ni du capital confié.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ───────────────  Le pont FLEX : les deux montants  ─────────────── */}
      {isFlex ? (
        <section className="commerce-band">
          <div className="commerce-shell py-20 lg:py-24">
            <Reveal>
              <p className="commerce-kicker">Ce que vous payez</p>
              <h2 className="commerce-section-title mt-5">Deux montants, annoncés d’avance.</h2>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="commerce-panel mt-10 overflow-hidden">
                <div className="grid divide-y divide-[color:var(--commerce-rule)] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                  <BridgeStep
                    step="Aujourd’hui"
                    amount={formatXof(reference.upfrontPrice)}
                    body="Vous réglez l’entrée et commencez l’évaluation immédiatement."
                    tone="accent"
                  />
                  <BridgeStep
                    step="Si vous réussissez"
                    amount={formatXof(reference.activationPrice)}
                    body="Le montant d’activation, figé au moment de votre achat. Il ne bouge plus."
                  />
                  <BridgeStep
                    step="Si vous échouez"
                    amount="0 FCFA"
                    body="L’activation n’est jamais prélevée. Votre coût réel reste celui de l’entrée."
                    tone="emerald"
                  />
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-[color:var(--commerce-rule)] bg-[color:var(--wariba-color-ink-920)] px-6 py-5">
                  <span className="text-sm text-[color:var(--wariba-color-ink-300)]">
                    Total si vous réussissez, taille 10K
                  </span>
                  <strong className="font-mono text-2xl font-bold tabular-nums text-[color:var(--wariba-color-ink-50)]">
                    {formatXof(reference.totalPriceIfSuccess)}
                  </strong>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ─────────────────────────  Le parcours  ───────────────────────── */}
      {isOne ? (
        <OneHowItWorks />
      ) : (
        <section className={isFlex ? '' : 'commerce-band'}>
          <div className="commerce-shell py-20 lg:py-24">
            <Reveal>
              <p className="commerce-kicker">Le parcours</p>
              <h2 className="commerce-section-title mt-5">Quatre étapes, dans cet ordre.</h2>
            </Reveal>

            {/* Le fil qui relie les étapes se dessine à l'entrée : il dit la
                progression que quatre cartes alignées ne disent pas. */}
            <div className="relative mt-12">
              <svg
                viewBox="0 0 1200 8"
                preserveAspectRatio="none"
                className="absolute left-0 top-6 hidden h-2 w-full lg:block"
                aria-hidden="true"
              >
                <DrawPath
                  d="M40 4 H 1160"
                  stroke="var(--wariba-color-cobalt-500)"
                  strokeWidth={2}
                  length={1200}
                  duration={1.1}
                />
              </svg>

              <ol className="relative grid gap-5 lg:grid-cols-4">
                {steps.map(([index, title, body], position) => (
                  <Reveal as="li" key={index} delay={position * 0.07}>
                    <article className="commerce-panel h-full p-6">
                      <span className="flex size-9 items-center justify-center rounded-full border border-[color:var(--commerce-accent-edge)] bg-[color:var(--wariba-color-ink-975)] font-mono text-xs font-bold text-[color:var(--wariba-color-cobalt-300)]">
                        {index}
                      </span>
                      <h3 className="mt-6 text-lg font-semibold text-[color:var(--wariba-color-ink-50)]">
                        {title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[color:var(--wariba-color-ink-300)]">
                        {body}
                      </p>
                    </article>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────  Scène de règle  ───────────────────────── */}
      {isOne ? (
        <OneEvaluationRules reference={reference} rulesAnchor={rulesAnchor} />
      ) : (
        <section id={rulesAnchor} className={isFlex ? 'commerce-band' : ''}>
          <div className="commerce-shell py-20 lg:py-24">
            <Reveal>
              <div className="commerce-rule-scene" data-tone={evaluation ? 'accent' : 'deep'}>
                <p
                  className={
                    evaluation
                      ? 'text-[11px] font-bold uppercase tracking-[0.18em] text-white/70'
                      : 'text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--wariba-color-cobalt-300)]'
                  }
                >
                  {heroRule.kicker}
                </p>
                <p
                  className={
                    evaluation
                      ? 'commerce-rule-figure mt-4'
                      : 'commerce-rule-figure mt-4 text-[color:var(--wariba-color-ink-50)]'
                  }
                >
                  {heroRule.figure}
                </p>
                <p
                  className={
                    evaluation
                      ? 'mt-4 text-xl font-semibold text-white'
                      : 'mt-4 text-xl font-semibold text-[color:var(--wariba-color-ink-50)]'
                  }
                >
                  {heroRule.title}
                </p>
                <p
                  className={
                    evaluation
                      ? 'mt-3 max-w-xl text-base leading-relaxed text-white/80'
                      : 'mt-3 max-w-xl text-base leading-relaxed text-[color:var(--wariba-color-ink-300)]'
                  }
                >
                  {heroRule.body}
                </p>
              </div>
            </Reveal>

            {/* Le corridor : deux bords, pas une barre. Une barre ne montre que
                la cible ; ce qui met fin à un compte est l'autre extrémité. */}
            <Reveal delay={0.08}>
              <div className="commerce-panel mt-6 p-6 sm:p-8">
                <p className="text-sm font-semibold text-[color:var(--wariba-color-ink-50)]">
                  Votre corridor, taille 10K
                </p>
                <p className="mt-1 text-sm text-[color:var(--wariba-color-ink-300)]">
                  À gauche la limite qui met fin au compte, à droite l’objectif. La bande ambrée est
                  la Limite quotidienne : elle avertit, elle ne clôt pas.
                </p>
                <RiskCorridor
                  className="mt-6"
                  floorLabel={`−${formatSimulatedAmount(evaluation?.maximumLossAmount ?? performance.maximumLossAmount, reference.nominalCurrency)}`}
                  targetLabel={
                    evaluation
                      ? `+${formatRate(evaluation.profitTargetRate)}`
                      : 'Versement disponible'
                  }
                  floorCaption="Perte maximale"
                  targetCaption={evaluation ? 'Objectif' : 'Cycle complet'}
                  positionPercent={evaluation ? 34 : 22}
                  dailyBandPercent={26}
                  currentLabel="Exemple de règle — pas un compte réel"
                />
              </div>
            </Reveal>

            {/* Les autres règles, en pastilles : lisibles d'un coup d'œil. */}
            <Reveal delay={0.12}>
              <dl className="mt-6 grid gap-px overflow-hidden rounded-[var(--wariba-radius-2xl)] border border-[color:var(--commerce-rule)] bg-[color:var(--commerce-rule)] sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Meilleure journée', formatRate(performance.bestDayMaximumRate)],
                  ['Réserve de sécurité', formatRate(performance.permanentBufferRate)],
                  ['Journées Performance', `${performance.performanceDaysRequired}`],
                  ['Part finale', formatRate(performance.payoutSplitSchedule.at(-1) ?? '0')],
                ].map(([label, value]) => (
                  <div key={label} className="commerce-stat">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>
      )}

      {isOne ? configuratorBlock : null}

      {/* ─────────────────────────  Échelle de partage  ─────────────────────
           ONE only: dropped for now — this is Performance-phase detail and
           belongs in that family's own later block (per the locked funnel:
           Hero → Comment ça marche → Règles → Configurateur → WariX → Après
           réussite/Performance → Transparence → FAQ → Final CTA), not stacked
           here right after the size selector. FLEX/INSTANT keep it. */}
      {isOne ? null : (
        <section className="commerce-performance-island">
          <div className="commerce-shell grid gap-12 py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:py-24">
            <Reveal>
              <p className="commerce-kicker">Ce que vous gardez</p>
              <h2 className="commerce-section-title mt-5">Rester paie davantage.</h2>
              <p className="commerce-lead mt-5">
                Le barème est attaché à votre compte le jour de l’achat. Un plafond propre à la
                taille s’applique, et une revue intervient après le cinquième cycle.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="commerce-panel p-6 sm:p-8">
                <PayoutLadder
                  steps={performance.payoutSplitSchedule.map((share, index) => ({
                    label: `Cycle ${index + 1}`,
                    share: formatRate(share),
                    state: index === 0 ? 'current' : 'upcoming',
                  }))}
                />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {isOne ? null : configuratorBlock}
    </>
  );
}

function BridgeStep({
  step,
  amount,
  body,
  tone,
}: {
  step: string;
  amount: string;
  body: string;
  tone?: 'accent' | 'emerald';
}) {
  const amountColour =
    tone === 'accent'
      ? 'text-[color:var(--wariba-color-cobalt-300)]'
      : tone === 'emerald'
        ? 'text-[color:var(--wariba-accent-emerald)]'
        : 'text-[color:var(--wariba-color-ink-50)]';
  return (
    <div className="p-6 sm:p-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--wariba-color-ink-300)]">
        {step}
      </p>
      <p className={`mt-3 font-mono text-2xl font-bold tabular-nums sm:text-3xl ${amountColour}`}>
        {amount}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--wariba-color-ink-300)]">
        {body}
      </p>
    </div>
  );
}
