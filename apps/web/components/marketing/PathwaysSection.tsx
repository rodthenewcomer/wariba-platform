import Link from 'next/link';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { ArrowRightIcon, SectionHeader } from '@wariba/ui';
import { Reveal } from '../motion/Reveal';
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

  return (
    <section aria-labelledby="pathways-title" className="relative overflow-hidden bg-[#060709]">
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

        {/* ── Chapitre 1 · ONE — copie à gauche, visualisation à droite ── */}
        <div className="mt-20 flex flex-col gap-10 sm:mt-24 lg:flex-row lg:items-center lg:gap-16">
          <Reveal className="min-w-0 lg:flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--wariba-brand-300)]">
              WARIBA ONE
            </p>
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
          className="mt-20 overflow-hidden rounded-[28px] border border-white/10 sm:mt-28"
        >
          <div
            className="p-6 sm:p-10 lg:p-14"
            style={{
              background:
                'radial-gradient(circle at 18% 12%, rgba(139,123,255,0.32), transparent 46%), radial-gradient(circle at 82% 82%, rgba(69,198,212,0.22), transparent 48%), linear-gradient(160deg, #171233 0%, #100e24 46%, #0a0b16 100%)',
            }}
          >
            <div className="max-w-xl">
              <div className="flex items-center gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B9B2FF]">
                  WARIBA FLEX · {flex.sizeCode}
                </p>
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/60">
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

            <div className="mx-auto mt-10 w-full max-w-[720px] sm:mt-14">
              <FlexPaymentTimeline
                sizeLabel={flex.sizeCode}
                upfrontValue={flexUpfrontParts.value}
                upfrontCurrency={flexUpfrontParts.currency}
                evaluationRateLabel={flexEvaluationRate}
                activationLabel={flexActivation}
              />
            </div>

            <div className="mt-10 flex justify-center sm:mt-14">
              <Link href="/challenges/flex" className="wariba-cta-primary">
                Découvrir FLEX
                <ArrowRightIcon size="sm" />
              </Link>
            </div>
          </div>
        </Reveal>

        {/* ── Chapitre 3 · INSTANT — produit à gauche, copie à droite (miroir de ONE) ── */}
        <div className="mt-20 flex flex-col gap-10 sm:mt-28 lg:flex-row lg:items-center lg:gap-16">
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
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#45C6D4]">
              WARIBA INSTANT
            </p>
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

        {/* ── Chapitre 4 · Performance, expliquée par le produit ── */}
        <div className="mt-20 grid gap-10 sm:mt-28 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16">
          <Reveal>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
              PERFORMANCE
            </p>
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
