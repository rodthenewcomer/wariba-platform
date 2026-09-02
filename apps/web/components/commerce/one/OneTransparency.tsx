import Link from 'next/link';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { buildHelpPolicyFacts } from '@wariba/application';
import { ArrowRightIcon } from '@wariba/ui';
import { getDb } from '../../../lib/db';
import { Reveal } from '../../motion/Reveal';
import { formatXof } from '../offer-ui';

interface OneTransparencyProps {
  reference: CanonicalOfferReadModel;
  configuratorAnchor: string;
}

interface ConsequenceState {
  label: string;
  body: string;
  tone: 'amber' | 'red' | 'neutral';
}

const TONE_DOT = {
  amber: 'bg-[color:var(--wariba-accent-amber)]',
  red: 'bg-[color:var(--wariba-accent-red)]',
  neutral: 'border-2 border-[color:var(--commerce-rule-strong)] bg-transparent',
} as const;

const TONE_LABEL = {
  amber: 'text-[color:var(--wariba-accent-amber)]',
  red: 'text-[color:var(--wariba-accent-red)]',
  neutral: 'text-[color:var(--commerce-text)]',
} as const;

/**
 * The reciprocal of `OneAfterSuccess` — that section sells the upside, this
 * one removes the objection it leaves standing: "what happens if it doesn't
 * go well?" Every consequence is read from `buildHelpPolicyFacts` so it
 * can't drift from the same explanations already shown in the Evaluation
 * Rules section.
 *
 * What this deliberately does not say: nothing about resets, retries or
 * repurchase. That commercial policy isn't locked yet, and a page that
 * states "you can try again" ahead of the actual policy is a promise WARIBA
 * hasn't made. The Evaluation-not-passed state stops at the one fact that
 * is true today.
 */
export async function OneTransparency({ reference, configuratorAnchor }: OneTransparencyProps) {
  const facts = (await buildHelpPolicyFacts(getDb())).facts;
  const noActivationFee = Number(reference.activationPrice) === 0;

  const states: readonly ConsequenceState[] = [
    {
      label: 'Limite quotidienne',
      body: facts.dailyLossRate.explanation,
      tone: 'amber',
    },
    {
      label: 'Perte maximale',
      body: facts.maximumLossRate.explanation,
      tone: 'red',
    },
    {
      label: 'Évaluation non réussie',
      body: 'Le compte concerné ne progresse pas vers WARIBA Performance.',
      tone: 'neutral',
    },
  ];

  const reassurance = [
    { label: 'Paiement unique', body: 'ONE reste un paiement unique, quelle que soit l’issue.' },
    ...(noActivationFee
      ? [{ label: 'Aucune activation', body: 'Aucun frais d’activation n’est dû après réussite.' }]
      : []),
    { label: 'Règles visibles', body: 'Les règles applicables restent consultables et versionnées.' },
    { label: 'Pas d’abonnement', body: 'Aucun abonnement obligatoire pendant l’Évaluation.' },
  ];

  return (
    <section className="commerce-band">
      <div className="commerce-shell py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <div>
            <Reveal>
              <p className="commerce-kicker">Transparence ONE</p>
              <h2 className="commerce-section-title mt-5">
                Vous savez aussi
                <span className="block">ce qui se passe si ça s’arrête.</span>
              </h2>
              <p className="commerce-lead mt-5">
                Une limite quotidienne, une perte maximale ou une Évaluation non réussie n’ont pas
                les mêmes conséquences. WARIBA vous les montre avant de commencer.
              </p>
            </Reveal>
          </div>

          <ol className="relative">
            <span
              aria-hidden="true"
              className="absolute bottom-2 left-[9px] top-2 w-px bg-[color:var(--commerce-rule-strong)]"
            />
            {states.map((state, position) => (
              <Reveal
                as="li"
                key={state.label}
                delay={0.06 + position * 0.08}
                className={
                  position > 0
                    ? 'relative mt-8 border-t border-[color:var(--commerce-rule)] pl-9 pt-8'
                    : 'relative pl-9'
                }
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1 size-[19px] rounded-full ${TONE_DOT[state.tone]}`}
                />
                <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${TONE_LABEL[state.tone]}`}>
                  {state.label}
                </p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[color:var(--commerce-text-dim)]">
                  {state.body}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={0.3} className="mt-16 border-t border-[color:var(--commerce-rule)] pt-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--commerce-text-dim)]">
            Ce qui ne change pas
          </p>
          <ul className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-start lg:gap-x-10">
            {reassurance.map((item, index) => (
              <li
                key={item.label}
                className={
                  index > 0
                    ? 'max-w-[16rem] lg:border-l lg:border-[color:var(--commerce-rule-strong)] lg:pl-10'
                    : 'max-w-[16rem]'
                }
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--commerce-text)]">
                  {item.label}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--commerce-text-dim)]">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.36} className="mt-14">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[var(--wariba-radius-2xl)] border border-[color:var(--commerce-rule)] bg-[color:var(--commerce-panel)] p-6 sm:p-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--commerce-text-dim)]">
                Votre ONE
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--commerce-text)]">
                {reference.sizeCode} · {formatXof(reference.upfrontPrice)}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--commerce-text-dim)]">
                Paiement unique
              </p>
            </div>
            <Link href={`#${configuratorAnchor}`} className="commerce-primary-action">
              Choisir ma taille
              <ArrowRightIcon size="sm" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
