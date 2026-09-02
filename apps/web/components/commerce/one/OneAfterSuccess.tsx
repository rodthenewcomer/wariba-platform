import type { CSSProperties } from 'react';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { buildHelpPolicyFacts } from '@wariba/application';
import { CheckIcon } from '@wariba/ui';
import { getDb } from '../../../lib/db';
import { Reveal } from '../../motion/Reveal';
import { FAMILY_ACCENT_VARS, formatRate } from '../offer-ui';

const ONE_ACCENT = FAMILY_ACCENT_VARS.WARIBA_ONE as CSSProperties;

interface OneAfterSuccessProps {
  reference: CanonicalOfferReadModel;
}

interface JourneyNode {
  label: string;
  figure?: string;
  body: string;
  state: 'done' | 'ahead';
}

/**
 * "What does success actually unlock?" — the question the Evaluation Rules
 * section leaves open. WariX is deliberately absent: it already has its own
 * section elsewhere on the site, and this one is about the account
 * lifecycle, not the trading surface.
 *
 * Every figure below comes from `buildHelpPolicyFacts` and
 * `reference.performanceRules` — the same Help Center source of truth
 * `OneEvaluationRules` already reads from, so a policy change can't leave
 * this section quietly wrong.
 */
export async function OneAfterSuccess({ reference }: OneAfterSuccessProps) {
  const facts = (await buildHelpPolicyFacts(getDb())).facts;
  const performance = reference.performanceRules;
  const schedule = performance.payoutSplitSchedule;
  const firstShare = schedule[0];
  const lastShare = schedule.at(-1);
  const shareRange =
    firstShare !== undefined && lastShare !== undefined
      ? firstShare === lastShare
        ? formatRate(lastShare)
        : `${formatRate(firstShare)} à ${formatRate(lastShare)}`
      : null;

  const nodes: readonly JourneyNode[] = [
    {
      label: 'ONE · Évaluation réussie',
      body: 'Objectif atteint, conditions respectées.',
      state: 'done',
    },
    {
      label: 'WARIBA Performance',
      body: 'Un nouveau compte simulé, ses propres règles.',
      state: 'ahead',
    },
    {
      label: 'Réserve de sécurité',
      figure: formatRate(performance.permanentBufferRate),
      body: facts.permanentBufferRate.explanation,
      state: 'ahead',
    },
    {
      label: 'Performance Days',
      figure: `${performance.performanceDaysRequired} par cycle`,
      body: facts.performanceDaysRequired.explanation,
      state: 'ahead',
    },
    {
      label: 'Conditions du cycle',
      body: 'Règles de risque respectées jusqu’à la fin du cycle.',
      state: 'ahead',
    },
    {
      label: 'Éligibilité payout',
      body: `Réserve, journées et conditions réunies avant toute demande.${shareRange ? ` Part conservée : ${shareRange}.` : ''}`,
      state: 'ahead',
    },
  ];

  return (
    <section className="commerce-band" style={ONE_ACCENT}>
      <div className="commerce-shell py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <Reveal>
              <p className="commerce-kicker">Après l’évaluation</p>
              <h2 className="commerce-section-title mt-5">
                Vous avez réussi ONE.
                <span className="block">Performance commence.</span>
              </h2>
              <p className="commerce-lead mt-5">
                Votre parcours continue dans un nouveau compte simulé, avec ses propres règles de
                progression et d’éligibilité aux payouts.
              </p>
            </Reveal>

            {/*
             * No buying moment here on purpose — the page keeps exactly
             * three: hero, configurator, final close. A CTA on every
             * section stops reading as premium and starts reading as
             * anxious.
             */}
            <Reveal delay={0.1} className="mt-10 border-t border-[color:var(--commerce-rule)] pt-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--commerce-text-dim)]">
                Après le cycle final
              </p>
              <h3 className="mt-3 text-xl font-semibold text-[color:var(--commerce-text)]">
                WARIBA Review
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[color:var(--commerce-text-dim)]">
                {facts.maxPayoutCyclesBeforeReview.explanation} Aujourd’hui, ce seuil est fixé à{' '}
                {facts.maxPayoutCyclesBeforeReview.value ?? 'un nombre publié de cycles'}.
              </p>
            </Reveal>
          </div>

          <ol className="relative">
            <span
              aria-hidden="true"
              className="absolute bottom-2 left-[9px] top-2 w-px bg-[color:var(--commerce-rule-strong)]"
            />
            {nodes.map((node, position) => (
              <Reveal
                as="li"
                key={node.label}
                delay={0.06 + position * 0.07}
                className={position > 0 ? 'relative mt-8 pl-9' : 'relative pl-9'}
              >
                <span
                  aria-hidden="true"
                  className={
                    node.state === 'done'
                      ? 'absolute left-0 top-0.5 flex size-[19px] items-center justify-center rounded-full bg-[color:var(--wariba-accent-emerald)]'
                      : 'absolute left-0 top-1 size-[19px] rounded-full border-2 border-[color:var(--commerce-canvas)] bg-[color:var(--commerce-accent)]'
                  }
                >
                  {node.state === 'done' ? (
                    <CheckIcon size="sm" className="size-3 text-[color:var(--commerce-canvas)]" />
                  ) : null}
                </span>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--commerce-accent-text)]">
                  {node.label}
                </p>
                {node.figure ? (
                  <p className="mt-1 font-mono text-lg font-bold text-[color:var(--commerce-text)]">
                    {node.figure}
                  </p>
                ) : null}
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[color:var(--commerce-text-dim)]">
                  {node.body}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
