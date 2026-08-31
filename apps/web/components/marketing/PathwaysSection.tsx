import Link from 'next/link';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { ArrowRightIcon, SectionHeader } from '@wariba/ui';
import { Reveal } from '../motion/Reveal';
import { MobilePathwaySwitcher, type MobilePathwayFamily } from './pathways/MobilePathwaySwitcher';
import { OneEvaluationPanel } from './scenes/OneEvaluationPanel';
import { FlexPaymentTimeline } from './scenes/FlexPaymentTimeline';
import { InstantAccountPanel } from './scenes/InstantAccountPanel';
import { PerformancePanel } from './scenes/PerformancePanel';
import {
  formatMultiple,
  formatNominal,
  formatRate,
  formatXof,
  xofParts,
} from '../commerce/offer-ui';

export interface PathwaysSectionProps {
  one: CanonicalOfferReadModel;
  flex: CanonicalOfferReadModel;
  instant: CanonicalOfferReadModel;
}

/**
 * Section 03 — Phase 3.4.5B.3R2.
 *
 * ## Why there is no 3D here
 *
 * Two rebuilds of this section tried to give ONE, FLEX and INSTANT a
 * proprietary "premium 3D object" — a reactor, a bridge, a portal — built in
 * SVG. Both read as icons rather than products, because approximating
 * machined metal and depth in flat vector shapes is not a thing a code agent
 * can execute at premium fidelity. This rebuild drops the attempt entirely:
 * every visual hook here is the same class of asset a trader would actually
 * see — an evaluation panel, a payment timeline, an active account screen —
 * built from DOM, SVG lines and real canonical numbers.
 *
 * ## What each chapter is not
 *
 * ONE is not a target icon. FLEX is not a bridge. INSTANT is not a portal.
 * Performance is not an orb. They are, respectively: a progress panel, a
 * payment timeline, an active-account mockup, and a compact dashboard strip —
 * the same four things a FTMO- or FundedNext-grade page would actually show.
 */
export function PathwaysSection({ one, flex, instant }: PathwaysSectionProps) {
  const oneTarget = formatRate(one.evaluationRules!.profitTargetRate);
  const oneMaximumLoss = formatRate(one.evaluationRules!.maximumLossRate);
  const oneUpfront = formatXof(one.upfrontPrice);

  const targetPoints = Number(one.evaluationRules!.profitTargetRate) * 100;
  const progressPoints = targetPoints * 0.8;
  const oneProgressLabel = `${formatPoints(progressPoints)} / ${formatPoints(targetPoints)} %`;

  const flexUpfrontParts = xofParts(flex.upfrontPrice);
  const flexEvaluationRate = formatRate(flex.evaluationRules!.profitTargetRate);
  const flexActivation = formatXof(flex.activationPrice);

  const instantBalance = formatNominal(instant.nominalBalance);
  const instantDailyLoss = formatRate(instant.performanceRules.dailyLossRate);
  const instantMaximumLoss = formatRate(instant.performanceRules.maximumLossRate);
  const instantExposure = formatMultiple(instant.performanceRules.grossExposureMaximumMultiple);

  /*
   * Mobile's one-family-at-a-time presentation, built from the exact same
   * copy and canonical numbers as the three desktop chapters below — never
   * a second source of truth. `visual` is each chapter's existing panel,
   * server-rendered here and handed to a client component as a plain
   * ReactNode: `MobilePathwaySwitcher` only ever picks which of these three
   * already-built trees to show, it never touches `one`/`flex`/`instant`.
   */
  const mobilePathwayFamilies: readonly MobilePathwayFamily[] = [
    {
      id: 'one',
      tabLabel: 'ONE',
      accent: 'var(--wariba-brand-400)',
      eyebrowNumber: '01',
      eyebrowLabel: 'WARIBA ONE',
      title: (
        <>
          Une évaluation.
          <span className="block">Un seul paiement.</span>
        </>
      ),
      supportingCopy:
        'Atteignez l’objectif, puis passez sur Performance. Aucun frais d’activation.',
      chips: [`Objectif ${oneTarget}`, 'Paiement unique', 'Aucun frais d’activation'],
      visual: (
        <OneEvaluationPanel
          sizeLabel={one.sizeCode}
          targetLabel={oneTarget}
          progressPercent={80}
          progressLabel={oneProgressLabel}
          maximumLossLabel={oneMaximumLoss}
          upfrontLabel={oneUpfront}
        />
      ),
      ctaLabel: 'Découvrir ONE',
      ctaHref: '/challenges/one',
      ctaVariant: 'secondary',
    },
    {
      id: 'flex',
      tabLabel: 'FLEX',
      accent: '#B9B2FF',
      eyebrowNumber: '02',
      eyebrowLabel: `WARIBA FLEX · ${flex.sizeCode}`,
      title: (
        <>
          Commencez maintenant.
          <span className="block">Payez le reste après votre réussite.</span>
        </>
      ),
      supportingCopy:
        'Un premier paiement aujourd’hui. L’activation n’est due que si vous réussissez.',
      visual: (
        <FlexPaymentTimeline
          sizeLabel={flex.sizeCode}
          upfrontValue={flexUpfrontParts.value}
          upfrontCurrency={flexUpfrontParts.currency}
          evaluationRateLabel={flexEvaluationRate}
          activationLabel={flexActivation}
        />
      ),
      ctaLabel: 'Découvrir FLEX',
      ctaHref: '/challenges/flex',
      ctaVariant: 'primary',
    },
    {
      id: 'instant',
      tabLabel: 'INSTANT',
      accent: 'var(--wariba-accent-cyan)',
      eyebrowNumber: '03',
      eyebrowLabel: 'WARIBA INSTANT',
      title: <>Pas d’évaluation.</>,
      supportingCopy: 'Commencez directement sur Performance, avec des limites plus serrées.',
      visual: (
        <InstantAccountPanel
          sizeLabel={instant.sizeCode}
          balanceLabel={instantBalance}
          dailyLossLabel={instantDailyLoss}
          maximumLossLabel={instantMaximumLoss}
          exposureLabel={instantExposure}
        />
      ),
      ctaLabel: 'Découvrir INSTANT',
      ctaHref: '/challenges/instant',
      ctaVariant: 'secondary',
    },
  ];

  return (
    <section
      aria-labelledby="pathways-title"
      className="relative overflow-hidden bg-[color:var(--wariba-canvas-deep)]"
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="mx-auto max-w-[var(--wariba-shell-max)] px-[var(--wariba-shell-gutter)] py-20 sm:py-28">
        <Reveal>
          <SectionHeader
            id="pathways-title"
            align="center"
            eyebrow="Choisissez votre parcours"
            title={
              <>
                Trois façons de commencer.
                <span className="block text-white/58">Choisissez la vôtre.</span>
              </>
            }
            lead="Payez une fois, payez le reste après votre réussite, ou commencez directement."
          />
        </Reveal>

        <nav
          aria-label="Les quatre étapes du parcours WARIBA"
          className="mt-12 hidden border-y border-white/10 lg:grid lg:grid-cols-4"
        >
          {[
            ['01', 'ONE', 'Évaluation'],
            ['02', 'FLEX', 'Paiement scindé'],
            ['03', 'INSTANT', 'Accès direct'],
            ['04', 'PERFORMANCE', 'Cycles de versement'],
          ].map(([number, label, detail], index) => (
            <div
              key={label}
              className={`flex items-center gap-4 py-4 ${index ? 'border-l border-white/10 pl-5' : ''}`}
            >
              <span className="wariba-figure text-xs font-bold text-[color:var(--wariba-brand-300)]">
                {number}
              </span>
              <span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/80">
                  {label}
                </span>
                <span className="mt-0.5 block text-xs text-white/45">{detail}</span>
              </span>
            </div>
          ))}
        </nav>

        {/*
         * Chapitres 1–3 (ONE / FLEX / INSTANT) — desktop only below `lg`.
         * Mobile gets one active pathway at a time via `MobilePathwaySwitcher`
         * instead of three full scenes stacked in sequence; see that
         * component and `mobilePathwayFamilies` above for why this never
         * duplicates canonical data. `hidden lg:block` rather than removing
         * this subtree on mobile keeps the split purely CSS-driven — no
         * window-width branching, no hydration mismatch risk.
         */}
        <div className="hidden lg:block">
          {/* ── Chapitre 1 · ONE — copie à gauche, visualisation à droite ── */}
          <div className="mt-12 flex flex-col gap-8 sm:mt-20 lg:flex-row lg:items-center lg:gap-16">
            <Reveal className="min-w-0 lg:flex-1">
              <div className="flex items-center gap-3">
                <span className="wariba-figure text-xs font-bold text-[color:var(--wariba-brand-300)]">
                  01
                </span>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--wariba-brand-300)]">
                  WARIBA ONE
                </p>
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
                Une évaluation.
                <span className="block">Un seul paiement.</span>
              </h3>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/62">
                Atteignez l’objectif, puis passez sur Performance. Aucun frais d’activation.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {[`Objectif ${oneTarget}`, 'Paiement unique', 'Aucun frais d’activation'].map(
                  (chip) => (
                    <li
                      key={chip}
                      className="rounded-full border border-[color:var(--wariba-brand-edge)] bg-[color:var(--wariba-brand-wash)] px-3 py-1.5 text-xs font-semibold text-white/85"
                    >
                      {chip}
                    </li>
                  ),
                )}
              </ul>
              <Link href="/challenges/one" className="wariba-cta-secondary mt-7">
                Découvrir ONE
                <ArrowRightIcon size="sm" />
              </Link>
            </Reveal>
            <Reveal delay={0.05} className="min-w-0 lg:flex-1">
              <OneEvaluationPanel
                sizeLabel={one.sizeCode}
                targetLabel={oneTarget}
                progressPercent={80}
                progressLabel={oneProgressLabel}
                maximumLossLabel={oneMaximumLoss}
                upfrontLabel={oneUpfront}
              />
            </Reveal>
          </div>

          {/* ── Chapitre 2 · FLEX — champ plein cobalt/indigo ── */}
          <Reveal
            delay={0.05}
            className="mt-14 overflow-hidden rounded-[28px] border border-white/10 sm:mt-28"
          >
            <div
              className="p-5 sm:p-10 lg:p-14"
              style={{
                background:
                  'radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--wariba-brand-400) 34%, transparent), transparent 46%), radial-gradient(circle at 82% 82%, color-mix(in srgb, var(--wariba-accent-cyan) 18%, transparent), transparent 48%), linear-gradient(160deg, color-mix(in srgb, var(--wariba-brand-700) 48%, var(--wariba-canvas-deep)) 0%, var(--wariba-canvas-base) 54%, var(--wariba-canvas-deep) 100%)',
              }}
            >
              <div className="max-w-xl">
                <div className="flex items-center gap-3">
                  <span className="wariba-figure text-xs font-bold text-[color:var(--wariba-brand-200)]">
                    02
                  </span>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B9B2FF]">
                    WARIBA FLEX · {flex.sizeCode}
                  </p>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.13em] text-white/60">
                    Exemple
                  </span>
                </div>
                <h3 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
                  Commencez maintenant.
                  <span className="block">Payez le reste après votre réussite.</span>
                </h3>
                <p className="mt-4 text-base leading-relaxed text-white/68">
                  Un premier paiement aujourd’hui. L’activation n’est due que si vous réussissez.
                </p>
              </div>

              <div className="mx-auto mt-8 w-full max-w-[720px] sm:mt-14">
                <FlexPaymentTimeline
                  sizeLabel={flex.sizeCode}
                  upfrontValue={flexUpfrontParts.value}
                  upfrontCurrency={flexUpfrontParts.currency}
                  evaluationRateLabel={flexEvaluationRate}
                  activationLabel={flexActivation}
                />
              </div>

              <div className="mt-8 flex justify-center sm:mt-14">
                <Link href="/challenges/flex" className="wariba-cta-primary">
                  Découvrir FLEX
                  <ArrowRightIcon size="sm" />
                </Link>
              </div>
            </div>
          </Reveal>

          {/* ── Chapitre 3 · INSTANT — produit à gauche, copie à droite (miroir de ONE) ── */}
          <div className="mt-14 flex flex-col gap-8 sm:mt-28 lg:flex-row lg:items-center lg:gap-16">
            <Reveal delay={0.05} className="min-w-0 lg:flex-1">
              <InstantAccountPanel
                sizeLabel={instant.sizeCode}
                balanceLabel={instantBalance}
                dailyLossLabel={instantDailyLoss}
                maximumLossLabel={instantMaximumLoss}
                exposureLabel={instantExposure}
              />
            </Reveal>
            <Reveal className="min-w-0 lg:flex-1">
              <div className="flex items-center gap-3">
                <span className="wariba-figure text-xs font-bold text-[color:var(--wariba-accent-cyan)]">
                  03
                </span>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--wariba-accent-cyan)]">
                  WARIBA INSTANT
                </p>
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
                Pas d’évaluation.
              </h3>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/62">
                Commencez directement sur Performance, avec des limites plus serrées.
              </p>
              <Link href="/challenges/instant" className="wariba-cta-secondary mt-7">
                Découvrir INSTANT
                <ArrowRightIcon size="sm" />
              </Link>
            </Reveal>
          </div>
        </div>

        {/* ── Mobile only: one active pathway at a time ── */}
        <MobilePathwaySwitcher
          families={mobilePathwayFamilies}
          defaultFamilyId="flex"
          className="mt-12 lg:hidden"
        />

        {/* ── Chapitre 4 · Performance, expliquée par le produit ── */}
        <div className="mt-14 grid gap-8 sm:mt-28 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="wariba-figure text-xs font-bold text-white/50">04</span>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                PERFORMANCE
              </p>
            </div>
            <h3 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
              Votre compte Performance.
            </h3>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/62">
              C’est là que vous remplissez les conditions de versement.
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
              Avec ONE ou FLEX, vous y accédez après réussite.
              <span className="block">
                Avec INSTANT, vous commencez directement sur Performance.
              </span>
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <PerformancePanel
              familyLabel="ONE"
              sizeLabel={one.sizeCode}
              performanceDaysRequired={one.performanceRules.performanceDaysRequired}
              performanceDayThresholdLabel={formatRate(
                one.performanceRules.performanceDayThresholdRate,
              )}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** `6.4` → `"6,4"`, `8` → `"8"` — no trailing zero on a whole number. */
function formatPoints(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1).replace('.', ',');
}
