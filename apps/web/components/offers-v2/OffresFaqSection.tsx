'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRightIcon } from '@wariba/ui';
import { useHydratedReducedMotion } from '../motion/useHydratedReducedMotion';
import { trackCommerceEvent } from '../commerce/commerce-analytics';

interface FaqItem {
  id: string;
  q: string;
  a: ReactNode;
}

function RuleLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[color:var(--wariba-brand-300)] transition-colors hover:text-[color:var(--wariba-brand-200)]"
    >
      {children}
      <ArrowRightIcon size="sm" />
    </Link>
  );
}

/*
 * The two questions whose answer must send the visitor somewhere more
 * authoritative — the FAQ removes the objection, the linked page removes
 * any remaining doubt. `/aide/risque-regles` and `/aide/payouts` (not a
 * bare `/regles` or `/payouts`, which don't exist as public routes — see
 * `public-nav.ts`'s own comment on exactly this) are WARIBA's real,
 * canonical destinations for these two topics.
 */
const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'real_money',
    q: 'Est-ce que je trade avec de l’argent réel ?',
    a: 'Non. WARIBA utilise des comptes de trading simulés. Les tailles affichées sont nominales : elles ne représentent ni un dépôt bancaire, ni un capital réel confié au trader.',
  },
  {
    id: 'offer_difference',
    q: 'Quelle est la différence entre ONE, FLEX et INSTANT ?',
    a: 'ONE fonctionne avec un paiement unique avant l’évaluation. FLEX répartit le coût en deux temps : un premier paiement pour l’évaluation, puis l’activation uniquement après réussite et les vérifications applicables. INSTANT ne comporte pas d’évaluation préalable : l’accès à Performance est direct, avec les règles applicables au parcours.',
  },
  {
    id: 'flex_activation',
    q: 'Comment fonctionne l’activation FLEX ?',
    a: 'Le montant d’activation est fixé dès votre achat. Il devient payable uniquement après la réussite de l’évaluation et les vérifications applicables. En cas d’échec, aucun paiement d’activation n’est dû.',
  },
  {
    id: 'performance_account',
    q: 'Qu’est-ce qu’un compte WARIBA Performance ?',
    a: 'WARIBA Performance est l’environnement simulé qui suit une évaluation réussie — ou auquel INSTANT donne accès directement. Vous y tradez selon les règles Performance et pouvez devenir éligible à une demande de payout si toutes les conditions applicables sont remplies. Il ne s’agit pas d’un compte financé réel ni d’une promesse de revenus.',
  },
  {
    id: 'risk_limit',
    q: 'Que se passe-t-il si j’atteins une limite de risque ?',
    a: (
      <>
        <p>
          La limite quotidienne bloque l’ouverture de nouvelles positions jusqu’au prochain reset
          selon les règles applicables. Un dépassement de la perte maximale peut mettre fin au
          compte concerné. Les conséquences exactes dépendent de la policy attachée au compte.
        </p>
        <RuleLink href="/aide/risque-regles">Voir toutes les règles</RuleLink>
      </>
    ),
  },
  {
    id: 'payout_eligibility',
    q: 'Suis-je éligible à un payout dès que je suis rentable ?',
    a: (
      <>
        <p>
          Non. Un profit positif ne suffit pas. L’éligibilité dépend des conditions Performance
          applicables, notamment des critères de progression, des Performance Days requis, des
          règles de risque, du buffer, des vérifications requises et de l’absence de blocage
          applicable au compte.
        </p>
        <RuleLink href="/aide/payouts">Voir les conditions de payout</RuleLink>
      </>
    ),
  },
  {
    id: 'fcfa_pricing',
    q: 'Les prix sont-ils disponibles en FCFA ?',
    a: 'Oui. Les prix commerciaux WARIBA sont affichés en FCFA (XOF). Vous voyez le montant applicable avant de continuer.',
  },
] as const;

/** A "+" that becomes a "−", never an "×" — the brief is explicit that a
    rotated plus reading as a dismiss control is the wrong affordance for
    "reveal an answer". Two independent bars instead of one rotated glyph:
    the horizontal bar never moves, the vertical one scales to nothing. */
function PlusMinusIcon({ open, reduced }: { open: boolean; reduced: boolean }) {
  const transition = reduced ? undefined : 'transform 220ms cubic-bezier(0.2,0,0,1)';
  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
      <span className="absolute h-px w-3.5 bg-current" />
      <span
        className="absolute h-3.5 w-px bg-current"
        style={{ transform: open ? 'scaleY(0)' : 'scaleY(1)', transition }}
      />
    </span>
  );
}

/**
 * Section — last-objections FAQ. Not a Help Center duplicate: every
 * question here exists to remove one specific thing that could stop a
 * high-intent visitor from continuing, nothing broader.
 *
 * One answer open at a time — opening a row closes whichever one was open,
 * rather than the previous "every `<details>` independent" behaviour that
 * let a visitor stack all seven open into one long scroll. Controlled
 * state instead of native `<details>` because the brief wants real
 * `aria-expanded`/`aria-controls` button semantics and a coordinated
 * height/opacity transition — the same idiom `RuleSurface`'s Performance
 * panel already uses, applied here to a list instead of one row.
 */
export function OffresFaqSection() {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]!.id);
  const reduced = useHydratedReducedMotion();

  const toggle = (item: FaqItem) => {
    const next = openId === item.id ? null : item.id;
    setOpenId(next);
    trackCommerceEvent(next ? 'commerce_faq_opened' : 'commerce_faq_closed', {
      questionId: item.id,
    });
  };

  return (
    <section className="commerce-band">
      <div className="commerce-shell py-16 lg:py-20">
        <p className="commerce-kicker">Dernières questions</p>
        <h2 className="commerce-section-title mt-5 max-w-2xl">Avant de choisir.</h2>

        <div className="mt-8 border-t border-[color:var(--commerce-rule)]">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            const triggerId = `faq-trigger-${item.id}`;
            const panelId = `faq-panel-${item.id}`;
            return (
              <div
                key={item.id}
                className="border-b border-l-2 pl-4 transition-colors"
                style={{
                  borderBottomColor: 'var(--commerce-rule)',
                  borderLeftColor: isOpen ? 'var(--wariba-brand-400)' : 'transparent',
                  background: isOpen ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}
              >
                <h3>
                  <button
                    type="button"
                    id={triggerId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(item)}
                    className="wariba-focus-ring flex min-h-11 w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="text-[length:var(--wariba-font-size-body-lg)] font-semibold text-[color:var(--wariba-on-dark)]">
                      {item.q}
                    </span>
                    <PlusMinusIcon open={isOpen} reduced={reduced} />
                  </button>
                </h3>
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  initial={false}
                  animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: reduced ? 0 : 0.26, ease: [0.2, 0, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="max-w-[840px] space-y-1 pb-5 pr-8 text-sm leading-relaxed text-[color:var(--wariba-on-dark-muted)]">
                    {item.a}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          <Link
            href="/aide"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[color:var(--wariba-brand-300)] hover:text-[color:var(--wariba-brand-200)]"
          >
            Centre d’aide
            <ArrowRightIcon size="sm" />
          </Link>
          <Link
            href="/aide/risque-regles"
            className="inline-flex min-h-11 items-center text-sm text-[color:var(--wariba-on-dark-dim)] hover:text-[color:var(--wariba-on-dark-muted)]"
          >
            Règles
          </Link>
          <Link
            href="/aide/payouts"
            className="inline-flex min-h-11 items-center text-sm text-[color:var(--wariba-on-dark-dim)] hover:text-[color:var(--wariba-on-dark-muted)]"
          >
            Payouts
          </Link>
        </div>
      </div>
    </section>
  );
}
