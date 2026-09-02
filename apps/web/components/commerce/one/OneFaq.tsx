import type { CSSProperties } from 'react';
import Link from 'next/link';
import type { CanonicalOfferReadModel } from '@wariba/application';
import { AccountToken } from '@wariba/ui';
import { Reveal } from '../../motion/Reveal';
import { FaqKnowledgeStack, type FaqItem } from '../../marketing/faq/FaqKnowledgeStack';
import { FAMILY_ACCENT_VARS, formatRate } from '../offer-ui';

/**
 * Scoped to the left column only, not the whole section: `FaqKnowledgeStack`
 * is shared with the homepage FAQ and hardcodes WARIBA blue for its own
 * question numbers/toggle — correct there, and not something this override
 * can or should reach without touching a component three other pages share.
 */
const ONE_ACCENT = FAMILY_ACCENT_VARS.WARIBA_ONE as CSSProperties;

interface OneFaqProps {
  reference: CanonicalOfferReadModel;
}

/**
 * The last objection-removal section before the final close — reuses
 * `FaqKnowledgeStack` (the homepage FAQ's own single-open accordion) rather
 * than a second implementation, just without its per-item illustrations:
 * this section's job is precision, not another visual.
 *
 * Best Day (question 03) is deliberately NOT described as "% of the
 * objective." The domain engine (`computeBestDayRatio`, rule ONE-022)
 * defines it as the best day's profit over the sum of all profitable
 * days — and the Help Center's own canonical copy already says exactly
 * that. A FAQ answer is the worst place to introduce a third, disagreeing
 * description of the same rule.
 */
export function OneFaq({ reference }: OneFaqProps) {
  const evaluation = reference.evaluationRules;
  if (!evaluation) throw new Error('WARIBA ONE offer is missing evaluation rules.');

  const bestDayRate = formatRate(evaluation.bestDayMaximumRate);
  const noActivationFee = Number(reference.activationPrice) === 0;

  const items: readonly FaqItem[] = [
    {
      id: 'one_payment_after_success',
      number: '01',
      category: 'Paiement',
      question: 'Dois-je payer autre chose après avoir réussi ONE ?',
      answer: noActivationFee
        ? 'Non. ONE fonctionne avec un paiement unique, sans frais d’activation après réussite. Le parcours continue ensuite vers WARIBA Performance sans nouveau paiement.'
        : 'ONE fonctionne avec un paiement unique. Le montant applicable après une réussite, s’il y en a un, est celui fixé par l’offre choisie au moment de l’achat.',
    },
    {
      id: 'one_pass_finalization',
      number: '02',
      category: 'Réussite',
      question: 'Quand mon Évaluation est-elle considérée comme réussie ?',
      answer:
        'Atteindre l’objectif ne suffit pas à lui seul : votre Évaluation doit rester conforme aux règles jusqu’à sa finalisation. Une fois validée, le parcours continue vers Performance.',
    },
    {
      id: 'one_best_day',
      number: '03',
      category: 'Règles',
      question: 'Que signifie « Meilleure journée » ?',
      answer: `La règle Meilleure journée limite la part de votre profit total qu’une seule journée peut représenter — aujourd’hui ${bestDayRate} pour ONE. Un dépassement ne fait pas perdre le compte, mais bloque le passage en Performance tant que la règle n’est pas respectée.`,
    },
    {
      id: 'one_after_success',
      number: '04',
      category: 'Performance',
      question: 'Que se passe-t-il après une réussite ?',
      answer:
        'ONE se termine, et votre parcours continue dans WARIBA Performance — un environnement toujours simulé, avec ses propres règles. Performance ne garantit aucun revenu.',
    },
    {
      id: 'one_payout_eligibility',
      number: '05',
      category: 'Payouts',
      question: 'Puis-je demander un payout dès que je suis rentable ?',
      answer:
        'Non. Un résultat positif ne suffit pas. Dans Performance, une demande de payout devient possible uniquement lorsque les conditions applicables du cycle sont remplies : la réserve requise, les Performance Days, les règles de risque et les vérifications applicables.',
    },
    {
      id: 'one_simulated_account',
      number: '06',
      category: 'Compte',
      question: 'ONE est-il un compte de trading avec de l’argent réel ?',
      answer:
        'Non. ONE est une Évaluation dans un environnement de trading simulé. Les tailles 5K, 10K, 25K, 50K et 100K sont des tailles nominales de comptes simulés — elles ne représentent ni un dépôt bancaire, ni du capital réel confié au trader.',
    },
  ];

  return (
    <section className="commerce-band">
      <div className="commerce-shell py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.62fr)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start" style={ONE_ACCENT}>
            <Reveal>
              <p className="commerce-kicker">Dernières questions</p>
              <h2 className="commerce-section-title mt-5">
                Ce que vous devez savoir
                <span className="block">avant de choisir ONE.</span>
              </h2>
              <p className="commerce-lead mt-5 max-w-sm">
                Paiement, réussite, Performance, règles : voici les réponses aux questions qui
                comptent vraiment avant de commencer.
              </p>
            </Reveal>

            <Reveal delay={0.08} className="mt-10 flex items-center gap-4">
              <AccountToken sizeCode={reference.sizeCode} family="one" width={64} />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--commerce-accent-text)]">
                  ONE · Évaluation
                </p>
                <p className="mt-1 text-xs text-[color:var(--commerce-text-dim)]">
                  Paiement unique · Évaluation → Performance
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.12} className="mt-8 border-t border-[color:var(--commerce-rule)] pt-6">
              <p className="max-w-sm text-xs leading-relaxed text-[color:var(--commerce-text-dim)]">
                Toutes les règles applicables restent consultables avant de continuer.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/aide"
                  className="text-xs font-semibold text-[color:var(--commerce-accent-text)] hover:underline"
                >
                  Centre d’aide →
                </Link>
                <Link
                  href="/legal/payouts"
                  className="text-xs font-semibold text-[color:var(--commerce-accent-text)] hover:underline"
                >
                  Payouts →
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.06}>
            <FaqKnowledgeStack items={items} defaultOpenId="one_payment_after_success" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
