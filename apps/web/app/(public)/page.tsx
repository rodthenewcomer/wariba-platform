import Link from 'next/link';
import { listCanonicalV2Offers } from '@wariba/application';
import { ArrowRightIcon, PublicSection, SectionHeader } from '@wariba/ui';
import { ProofRail } from '../../components/marketing/ProofRail';
import { PathwaysSection } from '../../components/marketing/PathwaysSection';
import { WaribaPath } from '../../components/marketing/scenes/WaribaPath';
import { HomeConfigurator } from '../../components/marketing/HomeConfigurator';
import { WariXProductTeaser } from '../../components/marketing/WariXProductTeaser';
import { RiskField } from '../../components/marketing/RiskField';
import { HowItWorksSection } from '../../components/marketing/how-it-works/HowItWorksSection';
import { Section07Intelligence } from '../../components/marketing/section07/Section07Intelligence';
import { AfriqueFrancophoneSection } from '../../components/marketing/afrique-francophone/AfriqueFrancophoneSection';
import { ContactPreviewSection } from '../../components/marketing/contact/ContactPreviewSection';
import { FaqSection } from '../../components/marketing/faq/FaqSection';
import { ClosingSection } from '../../components/marketing/closing/ClosingSection';
import { Reveal } from '../../components/motion/Reveal';
import { getDb } from '../../lib/db';

export const dynamic = 'force-dynamic';

/**
 * The WARIBA homepage — Phase 3.4.5B.
 *
 * ## The rhythm
 *
 * Twelve sections and no two consecutive ones share a composition. Product
 * hero → three full scenes → configurator → a saturated colour field →
 * four-step scenes → a data visualisation → a dark product surface → a
 * living dashboard → a regional map → a contact preview → FAQ → closing
 * scene. The variation is the point: a page that alternates
 * `text-left / card-right` nine times reads as a template no matter how
 * good each block is.
 *
 * Section 12 (Clôture) used to close a longer page — a drawdown visual, a
 * numbers grid, the live dashboard, the payout ladder and a guarantees grid
 * all followed it. Those five were cut; what they showed (rules, risk,
 * payouts, the dashboard) still lives on `/programme`, `/aide` and the
 * product pages this homepage already links to.
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
  const instant = offers.find((o) => o.productFamily === 'WARIBA_INSTANT' && o.sizeCode === '25K');
  if (!one || !instant) throw new Error('Catalogue V2 canonique incomplet.');

  /* Section 03 montre FLEX à sa taille d'entrée — 9 900 FCFA — pour que le
     chiffre corresponde exactement à celui déjà annoncé en Section 02
     (« Commencez dès 9 900 FCFA »). */
  const flexEntry = offers.find((o) => o.productFamily === 'WARIBA_FLEX' && o.sizeCode === '5K');
  if (!flexEntry) throw new Error('Catalogue V2 canonique incomplet.');

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
      <ClosingSection />
    </>
  );
}

