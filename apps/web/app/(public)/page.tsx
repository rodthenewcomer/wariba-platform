import Image from 'next/image';
import Link from 'next/link';
import { listCanonicalV2Offers } from '@wariba/application';
import {
  ArrowRightIcon,
  CheckIcon,
  PayoutLadder,
  PublicSection,
  SectionHeader,
  ShieldCheckIcon,
} from '@wariba/ui';
import { PerformanceShowcase } from '../../components/marketing/PerformanceShowcase';
import { ProofRail } from '../../components/marketing/ProofRail';
import { PathwaysSection } from '../../components/marketing/PathwaysSection';
import { WaribaPath } from '../../components/marketing/scenes/WaribaPath';
import { HomeConfigurator } from '../../components/marketing/HomeConfigurator';
import { PerformanceCore } from '../../components/marketing/scenes/PerformanceCore';
import { DrawdownScene } from '../../components/marketing/scenes/DrawdownScene';
import { WariXShowcase } from '../../components/marketing/scenes/WariXShowcase';
import { PerformanceDays } from '../../components/marketing/scenes/PerformanceDays';
import { Reveal } from '../../components/motion/Reveal';
import { formatNominal, formatRate, formatXof } from '../../components/commerce/offer-ui';
import { getDb } from '../../lib/db';

export const dynamic = 'force-dynamic';

/**
 * The WARIBA homepage — Phase 3.4.5B.
 *
 * ## The rhythm
 *
 * Fourteen sections and no two consecutive ones share a composition. Product
 * hero → three full scenes → configurator → a saturated colour field →
 * four-step scenes → a data visualisation → huge numbers → a dark product
 * surface → a living dashboard → a ladder → a proof grid → photography → FAQ →
 * closing scene. The variation is the point: a page that alternates
 * `text-left / card-right` nine times reads as a template no matter how good
 * each block is.
 *
 * ## Every figure comes from the server
 *
 * Targets, limits, reserves, splits, prices and the FLEX total are read from
 * the canonical offer model. Nothing on this page computes money, and nothing
 * generalises a rule across ONE, FLEX and INSTANT — five of their six risk
 * rules differ, so a sentence that covers all three is a false claim with a
 * nice layout.
 */
export default async function HomePage() {
  const offers = await listCanonicalV2Offers(getDb());

  const one = offers.find((o) => o.productFamily === 'WARIBA_ONE' && o.sizeCode === '25K');
  const flex = offers.find((o) => o.productFamily === 'WARIBA_FLEX' && o.sizeCode === '25K');
  const instant = offers.find((o) => o.productFamily === 'WARIBA_INSTANT' && o.sizeCode === '25K');
  if (!one || !flex || !instant) throw new Error('Catalogue V2 canonique incomplet.');

  /* Section 03 montre FLEX à sa taille d'entrée — 9 900 FCFA — pour que le
     chiffre corresponde exactement à celui déjà annoncé en Section 02
     (« Commencez dès 9 900 FCFA »). Le FAQ plus bas continue de citer FLEX
     25K, taille qu'il nomme explicitement. */
  const flexEntry = offers.find((o) => o.productFamily === 'WARIBA_FLEX' && o.sizeCode === '5K');
  if (!flexEntry) throw new Error('Catalogue V2 canonique incomplet.');

  const ladder = one.performanceRules.payoutSplitSchedule;

  return (
    <>
      {/* ───────────────  1 · Héros  ───────────────
          La promesse WARIBA, pas le produit. WariX a sa propre section plus
          bas : y montrer un terminal ici dépenserait ce moment en avance et
          laisserait la section produit sans rien de neuf à révéler. Le visuel
          du héros est donc une atmosphère — WARIBA PATH — et le texte
          garde la priorité visuelle. */}
      <section className="relative isolate overflow-hidden">
        <WaribaPath />

        <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] pb-24 pt-16 lg:pb-36 lg:pt-28">
          <div className="min-w-0 max-w-[46rem]">
            {/* La marque avant la mention. « TRADING SIMULÉ » seul faisait de
                l'avertissement la première chose que WARIBA dit de lui-même —
                la transparence reste entière, elle a juste un contexte. */}
            <p className="wariba-eyebrow">WARIBA · Trading simulé</p>

            {/*
             * Deux propositions, deux bénéfices : la clarté puis le suivi.
             *
             * L'ancienne version disait « Tradez. Progressez. Passez sur
             * Performance. » — trois verbes dont le dernier est faux pour
             * INSTANT, qui ne « passe » pas après une évaluation puisqu'il
             * n'en a pas. Une promesse qui n'est vraie que pour deux parcours
             * sur trois n'a rien à faire dans un H1.
             */}
            <h1 className="wariba-hero-title mt-6">
              Tradez avec des règles claires.
              <span className="block text-[color:var(--wariba-on-dark-muted)]">
                Progressez sans perdre le fil.
              </span>
            </h1>

            {/* Le filet : il sépare la promesse de l'explication sans ajouter
                un mot, et donne à la composition un point d'appui autre que
                l'alignement à gauche. */}
            <span
              aria-hidden="true"
              className="mt-9 block h-px w-24 bg-[linear-gradient(90deg,var(--wariba-brand-400),transparent)]"
            />

            <div className="lg:pl-8">
              {/* « choisissez votre façon de commencer » demandait au lecteur de
                  faire le lien lui-même ; nommer les trois parcours va droit au
                  but. Et « restent visibles en permanence » était administratif
                  — « à tout moment » est ce qu'on dit vraiment. */}
              <p className="wariba-lead mt-8 max-w-[36rem]">
                Choisissez ONE, FLEX ou INSTANT. Suivez vos limites et votre progression à tout
                moment.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/offres" className="wariba-cta-primary">
                  Choisir mon parcours
                  <ArrowRightIcon size="sm" />
                </Link>
                <Link href="/programme" className="wariba-cta-secondary">
                  Voir comment ça marche
                </Link>
              </div>

              {/* La divulgation vit sous les CTA, séparée du titre : elle est
                  une information, pas un argument. */}
              {/* Plus long, et plus juste. « Aucun dépôt ne vous est confié »
                  était bancal : ce qui n'est ni un dépôt ni du capital, c'est le
                  montant affiché sur le compte. La phrase le nomme. */}
              <p className="mt-7 max-w-lg text-sm leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
                Le trading est entièrement simulé. Le montant affiché sur votre compte n’est ni un
                dépôt ni du capital réel qui vous est confié.
              </p>
              <p className="mt-2 text-sm text-[color:var(--wariba-on-dark-dim)]">
                Les achats ne sont pas encore ouverts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────  2 · La preuve, en rail ─────────────── */}
      <PublicSection tone="band">
        <ProofRail />
      </PublicSection>

      {/* ───────────────  3 · ONE / FLEX / INSTANT pathways  ─────────────── */}
      <PathwaysSection one={one} flex={flexEntry} instant={instant} />

      {/* ───────────────  4 · Le configurateur  ─────────────── */}
      <PublicSection tone="band">
        <Reveal>
          <SectionHeader
            eyebrow="Votre compte"
            title="Trouvez le compte qui vous convient."
            lead="Choisissez un parcours et une taille : les règles et le prix s’affichent immédiatement."
          />
        </Reveal>
        <Reveal delay={0.08}>
          <div className="mt-12">
            <HomeConfigurator offers={offers} />
          </div>
        </Reveal>
      </PublicSection>

      {/* ───────────────  5 · Comment ça marche, en quatre scènes  ─────────────── */}
      <PublicSection>
        <Reveal>
          <SectionHeader eyebrow="Le parcours" title="Quatre étapes, dans cet ordre." />
        </Reveal>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: '01',
              title: 'Choisissez',
              body: 'Un parcours, une taille. Les règles sont fixées le jour de l’achat.',
              scene: <MiniPlate />,
            },
            {
              step: '02',
              title: 'Tradez',
              body: 'Sur WariX, avec vos limites suivies en direct pendant la séance.',
              scene: <MiniCandles />,
            },
            {
              step: '03',
              title: 'Progressez',
              body: 'Atteignez l’objectif sans franchir votre perte maximale.',
              scene: <MiniTarget />,
            },
            {
              step: '04',
              title: 'Performance',
              body: 'Vous passez sur le compte Performance et ouvrez vos cycles.',
              scene: <MiniCore />,
            },
          ].map((item, index) => (
            <Reveal as="li" key={item.step} delay={index * 0.06}>
              <article className="wariba-visual-card h-full overflow-hidden" data-variant="panel">
                <div className="flex h-[132px] items-center justify-center bg-[color:var(--wariba-canvas-deep)]">
                  {item.scene}
                </div>
                <div className="p-5">
                  <span className="wariba-figure text-xs font-bold text-[color:var(--wariba-brand-300)]">
                    {item.step}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-[color:var(--wariba-on-dark)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
                    {item.body}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </ol>
      </PublicSection>

      {/* ───────────────  6 · La perte maximale, expliquée par le visuel  ─────────────── */}
      <PublicSection tone="deep">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
          <Reveal>
            <SectionHeader
              eyebrow="La règle qui compte"
              title="Votre perte maximale, toujours visible."
              lead="C’est la seule limite qui met fin à un compte. Elle est affichée en permanence dans votre espace, pendant que vous tradez."
            />
            <Link href="/aide/risque-regles" className="wariba-cta-secondary mt-8">
              Comprendre les règles
              <ArrowRightIcon size="sm" />
            </Link>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="wariba-visual-card p-5 sm:p-7" data-variant="panel">
              <DrawdownScene
                familyLabel="ONE"
                sizeLabel={one.sizeCode}
                startBalance={formatNominal(one.nominalBalance)}
                floorBalance={formatNominal(
                  String(
                    Number(one.nominalBalance) - Number(one.evaluationRules!.maximumLossAmount),
                  ),
                )}
                maxLossRate={formatRate(one.evaluationRules!.maximumLossRate)}
              />
            </div>
          </Reveal>
        </div>
      </PublicSection>

      {/* ───────────────  7 · Les chiffres, en objets  ─────────────── */}
      <PublicSection tone="band" space="tight">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Reveal>
            <div className="wariba-visual-card h-full p-6 sm:p-8" data-variant="accent">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                Journées Performance · ONE {one.sizeCode}
              </p>
              <p className="commerce-rule-figure mt-4 text-white">
                {one.performanceRules.performanceDaysRequired}
              </p>
              <p className="mt-3 max-w-md text-base leading-relaxed text-white/85">
                Un cycle de versement s’ouvre après {one.performanceRules.performanceDaysRequired}{' '}
                journées qualifiantes.
              </p>
              <div className="mt-7">
                <PerformanceDays
                  required={one.performanceRules.performanceDaysRequired}
                  thresholdLabel={formatRate(one.performanceRules.performanceDayThresholdRate)}
                  onAccent
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="grid h-full gap-4">
              {[
                [
                  'Meilleure journée',
                  formatRate(one.performanceRules.bestDayMaximumRate),
                  'Une seule séance ne peut pas porter tout votre résultat.',
                ],
                [
                  'Réserve de sécurité',
                  formatRate(one.performanceRules.permanentBufferRate),
                  'Elle protège la suite de votre parcours, cycle après cycle.',
                ],
              ].map(([label, value, body]) => (
                <div key={label} className="wariba-visual-card p-6" data-variant="panel">
                  <p className="text-[length:var(--wariba-font-size-label-sm)] font-semibold uppercase tracking-[0.14em] text-[color:var(--wariba-on-dark-dim)]">
                    {label}
                  </p>
                  <p className="wariba-figure mt-2 text-4xl font-bold tracking-[-0.03em] text-[color:var(--wariba-on-dark)]">
                    {value}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
        <p className="mt-5 text-sm text-[color:var(--wariba-on-dark-dim)]">
          Valeurs de WARIBA ONE en taille {one.sizeCode}. Elles diffèrent sur FLEX et INSTANT.
        </p>
      </PublicSection>

      {/* ───────────────  8 · WariX  ─────────────── */}
      <PublicSection>
        <div className="wariba-product-surface">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-center">
            <Reveal>
              <p className="wariba-eyebrow">Le poste de travail</p>
              <h2 className="wariba-section-title mt-5">Tradez directement sur WariX.</h2>
              <ul className="mt-7 flex flex-col gap-4">
                {[
                  'Vos limites sont suivies pendant que vous tradez, pas après.',
                  'Ordres, positions et résultat au même endroit.',
                  'La même interface sur ordinateur et sur téléphone.',
                ].map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-3 text-base leading-relaxed text-[color:var(--wariba-on-dark-muted)]"
                  >
                    <CheckIcon
                      size="sm"
                      className="mt-1 shrink-0 text-[color:var(--wariba-brand-300)]"
                    />
                    {line}
                  </li>
                ))}
              </ul>
              <Link href="/warix" className="wariba-cta-secondary mt-8">
                Découvrir WariX
                <ArrowRightIcon size="sm" />
              </Link>
            </Reveal>
            <Reveal delay={0.08}>
              <WariXShowcase />
            </Reveal>
          </div>
        </div>
      </PublicSection>

      {/* ───────────────  9 · Le tableau de bord vivant  ─────────────── */}
      <PublicSection tone="band">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <Reveal>
            <PerformanceShowcase variant="full" />
          </Reveal>
          <Reveal delay={0.08}>
            <SectionHeader
              eyebrow="Votre suivi"
              title="Vous savez toujours où vous en êtes."
              lead="Solde, équité, journées validées, réserve et éligibilité au versement : les mêmes chiffres que ceux sur lesquels le serveur décide."
            />
            <Link href="/programme" className="wariba-cta-secondary mt-8">
              Comment ça marche
              <ArrowRightIcon size="sm" />
            </Link>
          </Reveal>
        </div>
      </PublicSection>

      {/* ───────────────  10 · L'échelle de partage  ─────────────── */}
      <PublicSection>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
          <Reveal>
            <SectionHeader
              eyebrow="Votre part"
              title="Votre part évolue avec votre parcours."
              lead="Le barème est attaché à votre compte le jour de l’achat. Un plafond propre à la taille s’applique, et une revue intervient après le cinquième cycle."
            />
          </Reveal>
          <Reveal delay={0.08}>
            <div className="wariba-visual-card p-6 sm:p-8" data-variant="panel">
              <PayoutLadder
                steps={ladder.map((share, index) => ({
                  label: `Cycle ${index + 1}`,
                  share: formatRate(share),
                  state: index === 0 ? 'current' : 'upcoming',
                }))}
                caption={`Barème de WARIBA ONE en taille ${one.sizeCode}.`}
              />
            </div>
          </Reveal>
        </div>
      </PublicSection>

      {/* ───────────────  11 · Ce que WARIBA garantit vraiment  ─────────────── */}
      <PublicSection tone="deep" space="tight">
        <Reveal>
          <SectionHeader
            eyebrow="Ce sur quoi vous pouvez compter"
            title="Pas de promesse. Des règles."
          />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [
              'Vos règles ne changent plus',
              'Elles sont attachées à votre compte au moment de l’achat.',
            ],
            [
              'Votre risque est suivi en direct',
              'Pendant la séance, pas dans un rapport du lendemain.',
            ],
            [
              'Aucun dépôt, aucun capital confié',
              'Le montant du compte est une unité de simulation.',
            ],
            ['Le serveur décide, pas l’écran', 'Prix d’exécution, risque, passage et versement.'],
            [
              'Chaque décision est traçable',
              'Vous pouvez contester une décision et suivre son instruction.',
            ],
            ['Les prix sont en FCFA', 'Les équivalents en USD sont donnés à titre indicatif.'],
          ].map(([title, body], index) => (
            <Reveal key={title} delay={index * 0.05}>
              <div className="wariba-visual-card h-full p-5" data-variant="panel">
                <ShieldCheckIcon size="sm" className="text-[color:var(--wariba-brand-300)]" />
                <h3 className="mt-4 text-base font-semibold text-[color:var(--wariba-on-dark)]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
                  {body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </PublicSection>

      {/* ───────────────  12 · Respiration éditoriale  ─────────────── */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/wariba-trader-abidjan.webp"
          alt=""
          fill
          sizes="100vw"
          className="-z-20 object-cover object-[62%_center]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--wariba-canvas-deep)_26%,color-mix(in_srgb,var(--wariba-canvas-deep)_62%,transparent)_60%,transparent)]"
        />
        <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-24 lg:py-32">
          <Reveal>
            <div className="max-w-xl">
              <p className="wariba-eyebrow">La discipline avant le reste</p>
              <h2 className="wariba-section-title mt-5">
                Ce qui vous fait passer, c’est votre méthode.
              </h2>
              <p className="wariba-lead mt-5">
                WARIBA ne vous apprend pas à trader. Il vous donne un cadre lisible, des limites
                claires et un endroit où votre progression se voit.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────  13 · Questions fréquentes  ─────────────── */}
      <PublicSection tone="band">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
          <Reveal>
            <SectionHeader eyebrow="Questions fréquentes" title="Ce qu’on nous demande le plus." />
            <div className="mt-8 hidden max-w-[260px] lg:block">
              <PerformanceCore />
            </div>
            <Link href="/aide" className="wariba-cta-secondary mt-8">
              Ouvrir le centre d’aide
              <ArrowRightIcon size="sm" />
            </Link>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="divide-y divide-[color:var(--wariba-seam)] border-y border-[color:var(--wariba-seam)]">
              {[
                {
                  q: 'Quelle différence entre ONE, FLEX et INSTANT ?',
                  a: `ONE et FLEX commencent par une évaluation, INSTANT non. Le moment du paiement change, et les limites aussi : la perte maximale est de ${formatRate(one.evaluationRules!.maximumLossRate)} sur ONE, ${formatRate(flex.evaluationRules!.maximumLossRate)} sur FLEX et ${formatRate(instant.performanceRules.maximumLossRate)} sur INSTANT.`,
                },
                {
                  q: 'Est-ce du trading réel ou simulé ?',
                  a: 'Entièrement simulé. Le montant affiché sur un compte est une unité de simulation : ce n’est ni un dépôt, ni un compte de courtage, ni de l’argent qui vous est confié.',
                },
                {
                  q: 'Comment fonctionne FLEX ?',
                  a: `Vous réglez un premier montant aujourd’hui — ${formatXof(flex.upfrontPrice)} en taille ${flex.sizeCode}. Le montant d’activation est figé à ce moment-là et n’est dû que si vous réussissez l’évaluation. Si vous échouez, il n’est jamais prélevé.`,
                },
                {
                  q: 'Quand puis-je demander un versement ?',
                  a: `Après ${one.performanceRules.performanceDaysRequired} Journées Performance sur votre compte Performance. Une journée compte à partir de ${formatRate(one.performanceRules.performanceDayThresholdRate)} de gain net.`,
                },
                {
                  q: 'Où est-ce que je trade ?',
                  a: 'Sur WariX, le poste de travail WARIBA, sur ordinateur comme sur téléphone. Aucun logiciel à installer.',
                },
              ].map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="wariba-focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-base font-semibold text-[color:var(--wariba-on-dark)] marker:content-none">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-[color:var(--wariba-brand-300)] transition-transform duration-[var(--wariba-motion-state)] group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--wariba-on-dark-dim)]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </PublicSection>

      {/* ───────────────  14 · Clôture  ─────────────── */}
      <PublicSection space="tight">
        <Reveal>
          <div className="wariba-strong-surface text-center" data-tone="deep">
            <div className="relative z-[1] mx-auto max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[color:var(--wariba-on-dark)] sm:text-5xl">
                Choisissez comment vous voulez commencer.
              </h2>
              <p className="wariba-lead mx-auto mt-5">
                Comparez ONE, FLEX et INSTANT, et lisez les règles avant de vous lancer.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link href="/offres" className="wariba-cta-primary">
                  Comparer les parcours
                  <ArrowRightIcon size="sm" />
                </Link>
                <Link href="/programme" className="wariba-cta-secondary">
                  Comment ça marche
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </PublicSection>
    </>
  );
}

/* ── Vignettes des quatre étapes ──
   Volontairement minuscules et sans dépendance : elles marquent l'étape, elles
   ne racontent pas l'histoire. Les objets qui la racontent sont plus haut. */

function MiniPlate() {
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" className="h-[84px] w-auto">
      <rect x="14" y="16" width="92" height="60" rx="14" fill="#2A2F3A" />
      <rect x="22" y="23" width="76" height="46" rx="10" fill="#0A0A0B" />
      <text
        x="60"
        y="53"
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill="none"
        stroke="#9DB4FF"
        strokeWidth="1"
      >
        25K
      </text>
      <rect x="38" y="70" width="44" height="2" rx="1" fill="#5C7FFF" opacity="0.8" />
    </svg>
  );
}

/* Named fields rather than a tuple: destructuring a nested array literal makes
   every element `T | undefined` under `noUncheckedIndexedAccess`. */
const CANDLE_SPECS = [
  { x: 24, y: 34, h: 58, up: true },
  { x: 44, y: 26, h: 50, up: true },
  { x: 64, y: 40, h: 66, up: false },
  { x: 84, y: 18, h: 44, up: true },
] as const;

function MiniCandles() {
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" className="h-[84px] w-auto">
      {CANDLE_SPECS.map(({ x, y, h, up }) => (
        <g key={x}>
          <line
            x1={x}
            y1={y - 8}
            x2={x}
            y2={y + h + 8}
            stroke={up ? '#36B37E' : '#F46E6E'}
            strokeWidth="1.5"
          />
          <rect
            x={x - 6}
            y={y}
            width="12"
            height={h}
            rx="2"
            fill={up ? '#36B37E' : '#F46E6E'}
            opacity="0.9"
          />
        </g>
      ))}
    </svg>
  );
}

function MiniTarget() {
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" className="h-[84px] w-auto">
      <circle
        cx="60"
        cy="45"
        r="32"
        fill="none"
        stroke="#5C7FFF"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <circle
        cx="60"
        cy="45"
        r="20"
        fill="none"
        stroke="#5C7FFF"
        strokeOpacity="0.5"
        strokeWidth="2"
      />
      <circle cx="60" cy="45" r="7" fill="#5C7FFF" />
      <path
        d="M12 74 C 30 68, 44 58, 56 50"
        fill="none"
        stroke="#9DB4FF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MiniCore() {
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" className="h-[84px] w-auto">
      <circle cx="60" cy="45" r="30" fill="#1A1C21" />
      <circle
        cx="60"
        cy="45"
        r="30"
        fill="none"
        stroke="#36B37E"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <circle cx="60" cy="45" r="16" fill="#36B37E" fillOpacity="0.28" />
      <circle cx="60" cy="45" r="7" fill="#36B37E" />
      {[0, 72, 144, 216, 288].map((a) => (
        <rect
          key={a}
          x="57"
          y="6"
          width="6"
          height="12"
          rx="3"
          fill="#5A6273"
          transform={`rotate(${a} 60 45)`}
        />
      ))}
    </svg>
  );
}
