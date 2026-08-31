import Link from 'next/link';
import { listCanonicalV2Offers } from '@wariba/application';
import {
  ArrowRightIcon,
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
import { DrawdownScene } from '../../components/marketing/scenes/DrawdownScene';
import { WariXProductTeaser } from '../../components/marketing/WariXProductTeaser';
import { PerformanceDays } from '../../components/marketing/scenes/PerformanceDays';
import { RiskField } from '../../components/marketing/RiskField';
import { HowItWorksSection } from '../../components/marketing/how-it-works/HowItWorksSection';
import { Section07Intelligence } from '../../components/marketing/section07/Section07Intelligence';
import { AfriqueFrancophoneSection } from '../../components/marketing/afrique-francophone/AfriqueFrancophoneSection';
import { ContactPreviewSection } from '../../components/marketing/contact/ContactPreviewSection';
import { FaqSection } from '../../components/marketing/faq/FaqSection';
import { Reveal } from '../../components/motion/Reveal';
import { formatNominal, formatRate } from '../../components/commerce/offer-ui';
import { getDb } from '../../lib/db';

export const dynamic = 'force-dynamic';

/**
 * The WARIBA homepage — Phase 3.4.5B.
 *
 * ## The rhythm
 *
 * Seventeen sections and no two consecutive ones share a composition. Product
 * hero → three full scenes → configurator → a saturated colour field →
 * four-step scenes → a data visualisation → huge numbers → a dark product
 * surface → a living dashboard → a regional map → a contact preview → FAQ →
 * closing scene → a ladder → a proof grid → photography. The variation is
 * the point: a page that alternates `text-left / card-right` nine times
 * reads as a template no matter how good each block is.
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
     (« Commencez dès 9 900 FCFA »). */
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

      {/* ───────────────  3 · Comment ça marche, en quatre étapes  ─────────────── */}
      <HowItWorksSection />

      {/* ───────────────  4 · ONE / FLEX / INSTANT pathways  ─────────────── */}
      <PathwaysSection one={one} flex={flexEntry} instant={instant} />

      {/* ───────────────  5 · Le configurateur  ─────────────── */}
      <PublicSection tone="band">
        <Reveal>
          <SectionHeader
            eyebrow="Configurez votre compte"
            title={
              <>
                Choisissez votre compte.
                <span className="block text-[color:var(--wariba-on-dark-muted)]">
                  Voyez l’essentiel avant de commencer.
                </span>
              </>
            }
            lead="Parcours, taille, prix et règles : comparez en quelques secondes."
          />
        </Reveal>
        <Reveal delay={0.08}>
          <div className="mt-12">
            <HomeConfigurator offers={offers} />
          </div>
        </Reveal>
      </PublicSection>

      {/* ───────────────  6 · Risque visible  ─────────────── */}
      <RiskField />

      {/* ───────────────  7 · WariX, l’espace de trading  ─────────────── */}
      <section
        className="relative isolate overflow-hidden bg-[color:var(--wariba-color-carbon-980)]"
        aria-labelledby="warix-teaser-title"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_27%_53%,color-mix(in_srgb,var(--wariba-brand-700)_24%,transparent),transparent_42%)]"
        />
        <div className="mx-auto grid max-w-[var(--wariba-shell-max)] items-center gap-12 px-[var(--wariba-shell-gutter)] py-20 lg:min-h-[min(84svh,780px)] lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.85fr)] lg:gap-16 lg:py-24">
          <div className="order-2 min-w-0 lg:order-1">
            <WariXProductTeaser />
            <Link href="/warix" className="warix-teaser-cta wariba-cta-secondary mt-8 lg:hidden">
              Découvrir WariX
              <ArrowRightIcon size="sm" className="warix-teaser-cta-arrow" />
            </Link>
          </div>
          <Reveal className="order-1 max-w-[28rem] lg:order-2 lg:-mt-7 lg:justify-self-end">
            <p className="wariba-eyebrow">WARIX · Plateforme propriétaire</p>
            <h2 id="warix-teaser-title" className="wariba-section-title mt-5 max-w-[11ch]">
              Votre trading.
              <br />
              Dans un seul espace.
            </h2>
            <p className="wariba-lead mt-6 max-w-[28rem]">
              Analysez le marché, passez vos ordres et gardez vos limites sous les yeux — au même
              endroit.
            </p>
            <Link
              href="/warix"
              className="warix-teaser-cta wariba-cta-secondary mt-9 hidden lg:inline-flex"
            >
              Découvrir WariX
              <ArrowRightIcon size="sm" className="warix-teaser-cta-arrow" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ───────────────  8 · Journal, Analytics, Trader Hub  ─────────────── */}
      <Section07Intelligence />

      {/* ───────────────  9 · Afrique francophone  ─────────────── */}
      <AfriqueFrancophoneSection />

      {/* ───────────────  10 · Contact, en aperçu  ─────────────── */}
      <ContactPreviewSection />

      {/* ───────────────  11 · Questions fréquentes  ─────────────── */}
      <FaqSection />

      {/* ───────────────  12 · Clôture  ─────────────── */}
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

      {/* ───────────────  13 · La perte maximale, expliquée par le visuel  ─────────────── */}
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

      {/* ───────────────  14 · Les chiffres, en objets  ─────────────── */}
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

      {/* ───────────────  15 · Le tableau de bord vivant  ─────────────── */}
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

      {/* ───────────────  16 · L'échelle de partage  ─────────────── */}
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

      {/* ───────────────  17 · Ce que WARIBA garantit vraiment  ─────────────── */}
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

    </>
  );
}

